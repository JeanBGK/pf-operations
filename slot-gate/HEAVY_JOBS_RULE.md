# Heavy jobs on the machine — rule (for CLAUDE.md)

**Why:** sessions launched database tests, browser walks and builds at the same time, the machine overloaded, runs timed out, and limits were raised instead — so everything got slower. Waiting must not become the new excuse either. This rule fixes both.

## The rule

1. **Every heavy job goes through the gate.** Heavy = database test containers (`affected-db-tests`, `test:db`), full test suites, browser runs (`test:e2e*`, the walk), production builds, anything starting Docker. Light work (editing, unit tests of one file, typecheck, lint, reading, writing docs, GPT review calls) never goes through the gate.

   ```
   python tools/workspace/heavy_slot.py run --session "<session name>" --job "<what, in business words>" --max-minutes <n> -- <command>
   ```

2. **One heavy job per session at a time.** The gate refuses a second one. Sub-agents of a session count as that session.

3. **Smallest test that proves the change.** Affected tests while building; the full suite once, just before merge.

4. **Queued is not idle.** While your job is queued or running, keep doing the light work: next fix, review fold, docs, the next change. Never report "waiting for the machine" as your status — report what you are doing meanwhile and your queue position.

5. **A time-out is a finding, not a setting.** Never raise `--max-minutes` or a test timeout to get past load. If a job is killed for overrunning, make the test smaller or find what is slow, then queue again.

6. **Release immediately.** The gate frees the slot when the command ends; read results afterwards, outside the slot.

7. **No heavy job starts during an ME run** (03:00, 15:00, 18:00 Bangkok, plus the refresh after). The gate enforces this.

8. **Jean's urgent work goes first.** A fix to something broken on Live may go ahead outside the queue; say so in the report.

9. **Check before you claim load.** `heavy_slot.py status` shows slots, queue and machine state. "The machine is busy" is only an acceptable reason if `status` shows it.

## Settings (start values, tune from the ledger)

| Setting | Start | Env var |
|---|---|---|
| Concurrent heavy jobs | 2 | `HEAVY_SLOTS` |
| Minimum free memory to start | 6 GB | `HEAVY_MIN_FREE_MEM_GB` |
| Maximum CPU to start | 85 % | `HEAVY_MAX_CPU_PCT` |
| Maximum running containers | 6 | `HEAVY_MAX_CONTAINERS` |
| Default job limit | 90 min | `--max-minutes` |
| Long-wait flag | 30 min | — |

After a week, read `heavy_slot.py log`: if waits are long and run times short, add a slot; if run times grow, remove one.

## Installing (for the session that builds it)

1. Put `heavy_slot.py` at `tools/workspace/heavy_slot.py` (beside `workspace_retention.py`). `pip install psutil` on the machine so memory/CPU checks work (without it, only containers and ME windows are checked).
2. Set the start values above against the machine's real cores and memory.
3. Add the rule above to CLAUDE.md and the workspace contract; add it to `tools/control/mandatory_reading.json`.
4. Wrap the heavy scripts (`affected-db-tests.mjs`, `test:e2e*`, the walk runner) so they call the gate themselves — then the rule cannot be forgotten.
5. Independent review (GPT) as usual; merge; tell each running session once.
