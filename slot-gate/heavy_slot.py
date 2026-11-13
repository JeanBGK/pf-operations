#!/usr/bin/env python3
"""heavy_slot — one shared gate for heavy jobs on Jean's machine.

Every heavy command (database test containers, full test suites, browser
page walks, builds) runs through this gate:

    python tools/workspace/heavy_slot.py run --session "Replenishment" \
        --job "BA8 affected db tests" --max-minutes 90 -- <command...>

What it does
  * Caps concurrent heavy jobs at SLOTS (default 2).
  * One heavy job per session at a time (a second one is refused, not queued).
  * Checks the machine before granting a slot: free memory, CPU load,
    running Docker containers, and the ME-run windows.
  * Queues first-come-first-served; the WAITING is done by this script, so a
    session never has to decide "should I wait?" and keeps working meanwhile.
  * Frees slots by itself: a holder whose process died or who overran its
    max-minutes is evicted (and the overrunning command is killed).
  * Logs every job (queued at, started at, waited, ran, exit code) to a
    shared ledger so the monitoring report can show who waits and how long.

Other commands
    heavy_slot.py status            # who holds, who is queued, machine state
    heavy_slot.py log [--today]     # ledger of finished jobs

Standard library only; psutil is used when installed for better readings.
Tested logic is platform-neutral; designed for Windows (C:/PFOps).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
import time
import uuid
from pathlib import Path

# ---------------------------------------------------------------- settings
ROOT = Path(os.environ.get("HEAVY_SLOT_DIR", "C:/PFOps/heavy-slots"))
SLOTS = int(os.environ.get("HEAVY_SLOTS", "2"))
MIN_FREE_MEM_GB = float(os.environ.get("HEAVY_MIN_FREE_MEM_GB", "6"))
MAX_CPU_PCT = float(os.environ.get("HEAVY_MAX_CPU_PCT", "85"))
MAX_CONTAINERS = int(os.environ.get("HEAVY_MAX_CONTAINERS", "6"))
POLL_SECONDS = int(os.environ.get("HEAVY_POLL_SECONDS", "15"))
DEFAULT_MAX_MINUTES = 90
LONG_WAIT_MINUTES = 30  # flagged in status/log
# ME runs, Bangkok time (UTC+7): no new heavy job starts in these windows.
ME_WINDOWS_BKK = [("02:50", "03:40"), ("14:50", "15:40"), ("17:50", "18:40")]
BKK = dt.timezone(dt.timedelta(hours=7))

HOLD = ROOT / "holders"
QUEUE = ROOT / "queue"
LEDGER = ROOT / "ledger.jsonl"


# ---------------------------------------------------------------- helpers
def now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def iso(t: dt.datetime) -> str:
    return t.isoformat(timespec="seconds")


def read_json(p: Path) -> dict | None:
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def write_new(p: Path, data: dict) -> bool:
    """Atomic create: True only if this process created the file."""
    try:
        fd = os.open(p, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return False
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return True


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        import psutil  # type: ignore
        return psutil.pid_exists(pid)
    except ImportError:
        pass
    if os.name == "nt":
        out = subprocess.run(["tasklist", "/FI", f"PID eq {pid}", "/NH"],
                             capture_output=True, text=True)
        return str(pid) in out.stdout
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def log(event: dict) -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    with open(LEDGER, "a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")


# ---------------------------------------------------------------- machine state
def machine_state() -> dict:
    s: dict = {"free_mem_gb": None, "cpu_pct": None, "containers": None}
    try:
        import psutil  # type: ignore
        s["free_mem_gb"] = round(psutil.virtual_memory().available / 2**30, 1)
        s["cpu_pct"] = psutil.cpu_percent(interval=1)
    except ImportError:
        pass
    if shutil.which("docker"):
        out = subprocess.run(["docker", "ps", "-q"], capture_output=True, text=True)
        if out.returncode == 0:
            s["containers"] = len(out.stdout.split())
    t = now().astimezone(BKK).strftime("%H:%M")
    s["me_window"] = any(a <= t < b for a, b in ME_WINDOWS_BKK)
    return s


def machine_ok(s: dict) -> tuple[bool, str]:
    if s["me_window"]:
        return False, "ME run window"
    if s["free_mem_gb"] is not None and s["free_mem_gb"] < MIN_FREE_MEM_GB:
        return False, f"free memory {s['free_mem_gb']} GB < {MIN_FREE_MEM_GB}"
    if s["cpu_pct"] is not None and s["cpu_pct"] > MAX_CPU_PCT:
        return False, f"CPU {s['cpu_pct']}% > {MAX_CPU_PCT}%"
    if s["containers"] is not None and s["containers"] > MAX_CONTAINERS:
        return False, f"{s['containers']} containers > {MAX_CONTAINERS}"
    return True, "ok"


# ---------------------------------------------------------------- slots & queue
def holders() -> list[tuple[Path, dict]]:
    out = []
    for p in sorted(HOLD.glob("slot-*.json")):
        d = read_json(p)
        if d:
            out.append((p, d))
    return out


def reap() -> None:
    """Free slots whose holder died or overran; drop dead queue entries."""
    for p, d in holders():
        overrun = now() > dt.datetime.fromisoformat(d["deadline"]) + dt.timedelta(minutes=2)
        if not pid_alive(d["pid"]) or overrun:
            p.unlink(missing_ok=True)
            log({"event": "evicted", "reason": "overran" if overrun else "holder gone",
                 **d, "at": iso(now())})
    for p in QUEUE.glob("*.json"):
        d = read_json(p)
        if not d or not pid_alive(d["pid"]):
            p.unlink(missing_ok=True)


def queue_entries() -> list[tuple[Path, dict]]:
    items = [(p, read_json(p)) for p in QUEUE.glob("*.json")]
    items = [(p, d) for p, d in items if d]
    return sorted(items, key=lambda x: x[1]["queued_at"])


def try_take_slot(entry: dict) -> Path | None:
    for i in range(SLOTS):
        p = HOLD / f"slot-{i}.json"
        if write_new(p, entry):
            return p
    return None


# ---------------------------------------------------------------- commands
def cmd_run(a: argparse.Namespace) -> int:
    if not a.command:
        print("heavy_slot: nothing to run (put the command after --)", file=sys.stderr)
        return 2
    HOLD.mkdir(parents=True, exist_ok=True)
    QUEUE.mkdir(parents=True, exist_ok=True)
    reap()

    # Rule: one heavy job per session at a time.
    mine = [d for _, d in holders() if d["session"] == a.session]
    mine += [d for _, d in queue_entries() if d["session"] == a.session]
    if mine:
        print(f"heavy_slot: REFUSED — session '{a.session}' already has a heavy job "
              f"('{mine[0]['job']}'). Finish or stop it first; keep doing light work.",
              file=sys.stderr)
        return 3

    queued_at = now()
    entry = {"id": uuid.uuid4().hex[:8], "session": a.session, "job": a.job,
             "pid": os.getpid(), "queued_at": iso(queued_at),
             "max_minutes": a.max_minutes, "command": " ".join(a.command)}
    qfile = QUEUE / f"{queued_at.strftime('%Y%m%dT%H%M%S%f')}-{entry['id']}.json"
    write_new(qfile, entry)
    log({"event": "queued", **entry})

    slot = None
    last_msg = ""
    try:
        while slot is None:
            reap()
            q = queue_entries()
            position = next((i for i, (p, _) in enumerate(q) if p == qfile), 0)
            free = SLOTS - len(holders())
            state = machine_state()
            ok, why = machine_ok(state)
            if position < free and ok:
                start = now()
                entry["started_at"] = iso(start)
                entry["deadline"] = iso(start + dt.timedelta(minutes=a.max_minutes))
                slot = try_take_slot(entry)
                if slot:
                    break
            held = "; ".join(f"{d['session']}/{d['job']} since {d['started_at'][11:16]}Z"
                             for _, d in holders()) or "none"
            msg = (f"heavy_slot: QUEUED position {position + 1}, machine: {why}, "
                   f"slots held: {held}. Waiting is automatic — carry on with light work.")
            if msg != last_msg:
                print(msg, flush=True)
                last_msg = msg
            time.sleep(POLL_SECONDS)
    finally:
        qfile.unlink(missing_ok=True)

    waited = (now() - queued_at).total_seconds() / 60
    print(f"heavy_slot: STARTED '{a.job}' after {waited:.1f} min wait "
          f"(limit {a.max_minutes} min)", flush=True)
    log({"event": "started", **entry, "waited_min": round(waited, 1)})

    code = 124
    try:
        proc = subprocess.Popen(a.command, shell=(os.name == "nt" and len(a.command) == 1))
        try:
            code = proc.wait(timeout=a.max_minutes * 60)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
            print(f"heavy_slot: KILLED — over its {a.max_minutes} min limit. "
                  "Do not just raise the limit: make the test smaller or find the slowness.",
                  file=sys.stderr)
    finally:
        slot.unlink(missing_ok=True)  # release the moment the job ends
        ran = (now() - dt.datetime.fromisoformat(entry["started_at"])).total_seconds() / 60
        log({"event": "finished", **entry, "waited_min": round(waited, 1),
             "ran_min": round(ran, 1), "exit": code, "at": iso(now())})
    return code


def cmd_status(_: argparse.Namespace) -> int:
    HOLD.mkdir(parents=True, exist_ok=True)
    QUEUE.mkdir(parents=True, exist_ok=True)
    reap()
    s = machine_state()
    ok, why = machine_ok(s)
    print(f"Machine: {why} | free mem {s['free_mem_gb']} GB | CPU {s['cpu_pct']}% | "
          f"containers {s['containers']} | slots {len(holders())}/{SLOTS} used")
    for _, d in holders():
        print(f"  RUNNING  {d['session']:<28} {d['job']:<40} since {d['started_at'][11:16]}Z "
              f"(limit {d['max_minutes']} min)")
    for i, (_, d) in enumerate(queue_entries(), 1):
        w = (now() - dt.datetime.fromisoformat(d["queued_at"])).total_seconds() / 60
        flag = "  <-- LONG WAIT" if w > LONG_WAIT_MINUTES else ""
        print(f"  QUEUED{i:>2} {d['session']:<28} {d['job']:<40} waiting {w:.0f} min{flag}")
    return 0


def cmd_log(a: argparse.Namespace) -> int:
    if not LEDGER.exists():
        print("no jobs logged yet")
        return 0
    today = now().date().isoformat()
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        e = json.loads(line)
        if e["event"] not in ("finished", "evicted"):
            continue
        if a.today and not e.get("queued_at", "").startswith(today):
            continue
        print(f"{e['queued_at'][11:16]}Z {e['session']:<28} {e['job']:<40} "
              f"waited {e.get('waited_min', '?')} ran {e.get('ran_min', '?')} min "
              f"exit {e.get('exit', e['event'])}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--session", required=True, help="session name, e.g. Replenishment")
    r.add_argument("--job", required=True, help="short business name of the job")
    r.add_argument("--max-minutes", type=int, default=DEFAULT_MAX_MINUTES)
    r.add_argument("command", nargs=argparse.REMAINDER)
    sub.add_parser("status")
    lg = sub.add_parser("log")
    lg.add_argument("--today", action="store_true")
    a = ap.parse_args()
    if a.cmd == "run" and a.command and a.command[0] == "--":
        a.command = a.command[1:]
    return {"run": cmd_run, "status": cmd_status, "log": cmd_log}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
