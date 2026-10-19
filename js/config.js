/* ===== EDIT THIS FILE: your personal details & which algorithms are enabled ===== */
const APP_CONFIG = {
  courseName: 'Artificial Intelligence',
  courseCode: '[COURSE CODE]',
  assignmentTitle: 'Interactive 8-Puzzle Problem Solver using AI Search Algorithms',
  studentName: '[YOUR NAME]',
  registerNumber: '[YOUR REGISTRATION NUMBER]',
  // Algorithm number 4 in the assignment = Iterative Deepening Depth Limited Search
  assignedAlgorithm: 'iddls',
  // Only the assigned algorithm is enabled. To re-enable others (e.g. for extra comparison):
  // ['bfs', 'dfs', 'dls', 'iddls', 'ucs', 'gbfs', 'astar']
  enabledAlgorithms: ['iddls'],
  defaultNodeLimit: 8000000, // safety cap; IDDLS on a 31-move puzzle needs ~4.6 million
  repoUrl: 'https://github.com/YashashwiniSiwach26/AI-8Puzzle-Visualizer',
  liveUrl: 'https://YashashwiniSiwach26.github.io/AI-8Puzzle-Visualizer'
};
