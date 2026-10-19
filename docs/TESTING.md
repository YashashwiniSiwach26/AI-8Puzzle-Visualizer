# Testing Documentation

## How to run
```
node tests/run-tests.js    # 67 algorithm / model tests
node tests/ui-smoke.js     # drives the real js/app.js against a stub DOM
```
Recorded output from the last run: `docs/test-output.txt` and `docs/ui-smoke-output.txt`.

## Automated test coverage (tests/run-tests.js)
| Area | What is checked |
|---|---|
| Input validation | valid state; duplicate tile; missing blank; wrong length; digit 9 / letters; `_` and empty accepted as blank |
| Solvability | goal vs itself; swapped-tile (unsolvable); assignment example; **relative to a custom goal**; random generator always solvable and never already solved |
| Heuristics | goal → 0; one move → 1; blank excluded; assignment example (misplaced 4, Manhattan 5); custom goal |
| Solved puzzle | all 7 engine algorithms return 0 moves |
| One-move puzzle | all 7 algorithms return 1 valid move |
| Correctness | all 7 return a path that is legal move-by-move and ends at the goal |
| Optimality | BFS, UCS, IDDLS, A* (both heuristics) = 5 moves on the assignment example; BFS = UCS = A* on 12 random puzzles |
| Depth limit | limit below optimal → `cutoff` (not failure); limit 0 → cutoff; sufficient limit → found; IDDLS iteration count |
| Unsolvable | BFS exhausts exactly 181,440 states → `failure`; A* → `failure`; tiny node limit → `limit` (not failure) |
| Statistics | generated ≥ expanded; trace has one event per expanded node and ends at the goal; `trace:false` records nothing |

## IDDLS-specific tests (added)
Textbook mode (`memo:false`) equals BFS on shallow puzzles and never repeats a state on its path; pruned mode solves the 31-move puzzle `867254301` optimally and 15 random puzzles of any depth, each matching BFS; the trimmed animation trace never references freed nodes and keeps the true totals.

## Real-browser run (headless Chromium, performed during development)
Default settings, no console errors: example puzzle solved in 5 moves; the 31-move puzzle typed into the grid solved with 31 moves; textbook mode solved the example; unsolvable state flagged; comparison table filled; no horizontal overflow at 390 px width. Screenshots in `images/`.

## UI smoke test (tests/ui-smoke.js)
For each enabled algorithm (IDDLS in this build): Run → playback → summary/panels populated. Also Pause, Resume, Next, Previous, Reset, duplicate-tile rejection, unsolvable-state blocking, random puzzle, and the comparison run.
**Limitation:** this uses a stub DOM, so it proves the logic executes without errors, not that the page *looks* right.

## Manual browser checklist (do this before submitting; tick each box)
- [ ] Home page shows your name and registration number
- [ ] Solver: Load assignment example → Run IDDLS → board animates, panels update, depth limit increases
- [ ] Type a duplicate digit → red input + error message; Run is blocked
- [ ] Swap two tiles to make an unsolvable state → warning; Run is blocked
- [ ] Generate Random Puzzle repeatedly → always "Valid and solvable"
- [ ] Change the goal state, run IDDLS → solves to the new goal
- [ ] IDDLS with max depth 3 on the example → "CUTOFF"; max depth 5 or more → "Solution Found"
- [ ] Type `8 6 7 / 2 5 4 / 3 _ 1` with the standard goal → IDDLS finds 31 moves (takes ~10–20 s; the page shows "Searching…")
- [ ] Untick *Prune repeated states* on a hard puzzle → status says node limit (expected for the textbook mode)
- [ ] Pause / Resume / Next Step / Previous Step / speed slider / Reset all work
- [ ] Comparison page: Run enabled algorithms → table shows the IDDLS row
- [ ] Algorithm Info page expands for every algorithm
- [ ] Resize the browser to phone width: nothing overflows the page
- [ ] GitHub Pages URL loads and works the same as locally

## Known limitations
- DFS solution paths can be thousands of moves long (normal behaviour for DFS); the path strip shows only the first 120 steps.
- The hardest puzzles (≈30 moves) take 10–20 s of computation in the browser, during which the page is busy. Textbook (unpruned) mode cannot finish puzzles deeper than ~23 moves within the default limit.
- Memory is an estimate (peak stored nodes × 64 bytes).
