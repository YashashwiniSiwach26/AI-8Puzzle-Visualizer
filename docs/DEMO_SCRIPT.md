# 3–5 Minute Demonstration Script

Record your screen with the live GitHub Pages site open (any screen recorder; speak while you click). Target ≈ 4 minutes.

**0:00 – Intro (20 s)**
"I'm [yashashwini Siwach], register number [24bci0159]. This is my Interactive 8-Puzzle Solver for AI. My assigned algorithm is Iterative Deepening Depth Limited Search, implemented from scratch in plain JavaScript with Bootstrap." 

**0:20 – Puzzle setup (30 s)**
Go to Solver. "I can type the initial and goal state; invalid input like a duplicate tile is rejected, and unsolvable states are detected using inversion parity relative to the goal." Type a duplicate, then a swapped pair, then click **Generate Random Puzzle**.

**0:50 – IDDLS, my assigned algorithm (75 s)**
Click Load assignment example, select IDDLS, Run. "IDDLS repeats depth-limited search with limit 0, 1, 2…, so it is complete and optimal for unit cost with small memory." Point at: current depth limit changing, current node, parent, frontier (stack), explored list, successors, generated/expanded counters. Use **Pause**, **Next Step**, **Previous Step**, **Resume**, change speed. "Each time a limit is exhausted without the goal it reports *cutoff* and the limit increases."

**2:05 – Solution (30 s)**
"The blank tile slides along the solution path." Show the summary: moves, nodes generated/expanded, max depth, time, path cost, approximate memory, and the step-by-step path.

**2:35 – Cutoff vs success (35 s)**
Set IDDLS maximum depth to 3 → *cutoff* ("a deeper solution may exist, this is not proof of unsolvability"); set it back to 40 → found. Explain: IDDLS re-runs depth-limited search, so shallow nodes are re-expanded, which is the price for low memory.

**3:10 – Heuristics (25 s)**
"IDDLS is uninformed, so it uses no heuristic. For reference, the engine also has Misplaced Tiles and Manhattan Distance, used by GBFS and A*, which are not part of my assigned algorithm." (Delete this segment if you do not want to mention them.)

**3:35 – Comparison (35 s)**
Open Comparison → Run enabled algorithms. Read the real IDDLS numbers: moves, nodes generated/expanded, max depth, time, memory. Explain they are measured live; memory is an estimate.

**4:10 – Wrap-up (20 s)**
Open Algorithm Info briefly. "Each algorithm lists principle, advantages, limitations, complexity, completeness and optimality. The project is deployed on GitHub Pages; the README has setup details. Thank you."
