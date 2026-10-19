🧩 AI-8Puzzle-Visualizer

An interactive web-based 8-Puzzle Solver that visualizes Artificial Intelligence search algorithms. Developed as part of the Artificial Intelligence (BCSE306L) digital assignment.

🔗 Live Demo: https://YashashwiniSiwach26.github.io/AI-8Puzzle-Visualizer/

👩‍🎓 Student Details
Name: [YASHASHWINI SIWACH]
Registration No.: [24BCI0159]
Course: Artificial Intelligence – BCSE306L
Assigned Algorithm: Algorithm No. 4 – Iterative Deepening Depth-Limited Search (IDDLS)
✨ Features
Interactive 8-puzzle board with customizable initial and goal states.
Random solvable puzzle generation.
Animated search visualization.
Live display of the frontier, explored nodes, and search depth.
Step-by-step playback controls.
Solution statistics and algorithm comparison.
Responsive interface.
🧠 Algorithm

The project focuses on Iterative Deepening Depth-Limited Search (IDDLS), an uninformed search algorithm that repeatedly increases the depth limit until the goal is found.

The search engine also includes BFS, DFS, DLS, UCS, GBFS, and A*, but only IDDLS is enabled in the application interface.

🛠️ Technologies Used
HTML5
CSS3
JavaScript (ES6)
Bootstrap 5.3
Node.js for testing
🚀 How to Run
Clone the repository:
git clone https://github.com/YashashwiniSiwach26/AI-8Puzzle-Visualizer.git

Open the project folder.
Run index.html in your browser.

Alternatively, start a local server:

python3 -m http.server 8000


Then visit http://localhost:8000.

🧪 Run Tests
node tests/run-tests.js
node tests/ui-smoke.js

📂 Project Structure
AI-8Puzzle-Visualizer/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   ├── puzzle.js
│   ├── algorithms.js
│   ├── info.js
│   └── app.js
├── tests/
├── docs/
├── images/
└── README.md

🌐 Deployment

Hosted using GitHub Pages.

Repository: https://github.com/YashashwiniSiwach26/AI-8Puzzle-Visualizer/

Live Website: https://YashashwiniSiwach26.github.io/AI-8Puzzle-Visualizer/

Developed as an Artificial Intelligence case study to demonstrate state-space search and problem-solving techniques.