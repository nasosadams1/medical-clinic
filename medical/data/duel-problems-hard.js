import { problem, tc } from './duel-problem-utils.js';

export const hardDuelProblems = [
  problem({
    title: 'Turing\'s Cipher Relay',
    scientist: 'Alan Turing',
    shortStory: 'a message can move between code words only by changing one letter at a time through approved intermediate words.',
    problemStatement: 'Given `beginWord`, `endWord`, and an array `words`, return the minimum number of words in a transformation sequence from `beginWord` to `endWord` such that consecutive words differ in exactly one position and every intermediate word belongs to `words`. If no sequence exists, return `0`.',
    inputFormat: 'An object with `beginWord` (string), `endWord` (string), and `words` (string array).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= words.length <= 5000; all words have the same length between 1 and 10.',
    solutionExplanation: 'Build wildcard patterns such as `h*t` and map each pattern to all words matching it. Then run BFS from the start word. The first time the end word is reached gives the shortest transformation length.',
    referenceSolutionJavascript: `
function solution(input) {
  const { beginWord, endWord, words } = input;
  const dict = new Set(words);
  if (!dict.has(endWord)) return 0;
  const allWords = [...dict, beginWord];
  const patterns = new Map();
  for (const word of allWords) {
    for (let i = 0; i < word.length; i++) {
      const pattern = word.slice(0, i) + '*' + word.slice(i + 1);
      if (!patterns.has(pattern)) patterns.set(pattern, []);
      patterns.get(pattern).push(word);
    }
  }
  const queue = [[beginWord, 1]];
  const seen = new Set([beginWord]);
  for (let head = 0; head < queue.length; head++) {
    const [word, dist] = queue[head];
    if (word === endWord) return dist;
    for (let i = 0; i < word.length; i++) {
      const pattern = word.slice(0, i) + '*' + word.slice(i + 1);
      const nextWords = patterns.get(pattern) || [];
      for (const next of nextWords) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push([next, dist + 1]);
        }
      }
      patterns.set(pattern, []);
    }
  }
  return 0;
}`,
    difficulty: 'hard',
    tags: ['graphs', 'bfs', 'strings'],
    estimatedTimeMinutes: 20,
    ratingWeight: 2.2,
    timeLimitSeconds: 1200,
    testCases: [
      tc({ beginWord: 'cold', endWord: 'warm', words: ['cord', 'card', 'ward', 'warm', 'word'] }, 5),
      tc({ beginWord: 'lead', endWord: 'gold', words: ['load', 'goad', 'gold'] }, 4),
      tc({ beginWord: 'same', endWord: 'cost', words: ['came', 'case', 'cast'] }, 0),
      tc({ beginWord: 'spin', endWord: 'spot', words: ['span', 'span', 'spit', 'spat', 'spot'] }, 3, { hidden: true }),
      tc({ beginWord: 'hit', endWord: 'cog', words: ['hot', 'dot', 'dog', 'lot', 'log', 'cog'] }, 5, { hidden: true }),
    ],
  }),
  problem({
    title: 'Kovalevskaya\'s Gravity Route',
    scientist: 'Sofia Kovalevskaya',
    shortStory: 'stations are connected by weighted tunnels, and the cheapest route from the launch node to the target must be computed.',
    problemStatement: 'Given `n` nodes labeled `0..n-1`, an array of directed weighted edges `[from, to, cost]`, a `start`, and a `target`, return the minimum total cost from `start` to `target`. If no route exists, return `-1`.',
    inputFormat: 'An object with `n` (integer), `edges` (array of triples), `start` (integer), and `target` (integer).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= n <= 100000; 0 <= edges.length <= 200000; 0 <= cost <= 10^9.',
    solutionExplanation: 'Use Dijkstra\'s algorithm because all edge costs are non-negative. Maintain the current best distance to every node and always expand the not-yet-processed node with the smallest distance.',
    referenceSolutionJavascript: `
class MinHeap {
  constructor() { this.data = []; }
  push(item) {
    this.data.push(item);
    let i = this.data.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.data[p][0] <= this.data[i][0]) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length) {
      this.data[0] = last;
      let i = 0;
      while (true) {
        let left = 2 * i + 1;
        let right = left + 1;
        let best = i;
        if (left < this.data.length && this.data[left][0] < this.data[best][0]) best = left;
        if (right < this.data.length && this.data[right][0] < this.data[best][0]) best = right;
        if (best === i) break;
        [this.data[i], this.data[best]] = [this.data[best], this.data[i]];
        i = best;
      }
    }
    return top;
  }
  size() { return this.data.length; }
}

function solution(input) {
  const { n, edges, start, target } = input;
  const graph = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) graph[u].push([v, w]);
  const dist = Array(n).fill(Infinity);
  dist[start] = 0;
  const heap = new MinHeap();
  heap.push([0, start]);
  while (heap.size()) {
    const [cost, node] = heap.pop();
    if (cost !== dist[node]) continue;
    if (node === target) return cost;
    for (const [next, weight] of graph[node]) {
      const candidate = cost + weight;
      if (candidate < dist[next]) {
        dist[next] = candidate;
        heap.push([candidate, next]);
      }
    }
  }
  return -1;
}`,
    difficulty: 'hard',
    tags: ['graphs', 'dijkstra'],
    estimatedTimeMinutes: 20,
    ratingWeight: 2.3,
    timeLimitSeconds: 1200,
    testCases: [
      tc({ n: 4, edges: [[0,1,3],[1,3,4],[0,2,10],[2,3,1]], start: 0, target: 3 }, 7),
      tc({ n: 3, edges: [[0,1,5]], start: 0, target: 2 }, -1),
      tc({ n: 5, edges: [[0,1,2],[1,2,2],[0,2,10],[2,4,1],[1,4,10]], start: 0, target: 4 }, 5),
      tc({ n: 1, edges: [], start: 0, target: 0 }, 0, { hidden: true }),
      tc({ n: 6, edges: [[0,1,7],[0,2,9],[0,5,14],[1,2,10],[1,3,15],[2,3,11],[2,5,2],[3,4,6],[5,4,9]], start: 0, target: 4 }, 20, { hidden: true }),
    ],
  }),
  problem({
    title: 'Bell\'s Echo Matrix',
    scientist: 'Alexander Graham Bell',
    shortStory: 'signal strength rises across a matrix, and the longest strictly increasing route must be measured.',
    problemStatement: 'Given a matrix of integers, return the length of the longest path where every next cell is adjacent up, down, left, or right and contains a strictly larger value.',
    inputFormat: 'An object with `grid` (2D integer array).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= rows, cols <= 200; -10^9 <= grid[r][c] <= 10^9.',
    solutionExplanation: 'Use DFS with memoization. The best path starting from a cell is 1 plus the best path of any larger neighbor. Cache the result per cell so each state is solved once.',
    referenceSolutionJavascript: `
function solution(input) {
  const grid = input.grid;
  const rows = grid.length;
  const cols = grid[0].length;
  const memo = Array.from({ length: rows }, () => Array(cols).fill(0));
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  function dfs(r, c) {
    if (memo[r][c]) return memo[r][c];
    let best = 1;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      if (grid[nr][nc] > grid[r][c]) {
        best = Math.max(best, 1 + dfs(nr, nc));
      }
    }
    memo[r][c] = best;
    return best;
  }
  let answer = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      answer = Math.max(answer, dfs(r, c));
    }
  }
  return answer;
}`,
    difficulty: 'hard',
    tags: ['dynamic-programming', 'graphs', 'dfs'],
    estimatedTimeMinutes: 20,
    ratingWeight: 2.3,
    timeLimitSeconds: 1200,
    testCases: [
      tc({ grid: [[9,9,4],[6,6,8],[2,1,1]] }, 4),
      tc({ grid: [[3,4,5],[3,2,6],[2,2,1]] }, 4),
      tc({ grid: [[7]] }, 1),
      tc({ grid: [[1,2,3],[6,5,4],[7,8,9]] }, 9, { hidden: true }),
      tc({ grid: [[5,4],[3,2]] }, 3, { hidden: true }),
    ],
  }),
  problem({
    title: 'Nash\'s Coin Strategy',
    scientist: 'John Nash',
    shortStory: 'two players alternately take a coin from either end of a line, and the first player wants the maximum score difference.',
    problemStatement: 'Given an array `coins`, two players alternately take one coin from either the left end or the right end. Both play optimally. Return the final score difference `firstPlayerScore - secondPlayerScore`.',
    inputFormat: 'An object with `coins` (integer array).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= coins.length <= 2000; -10^6 <= coins[i] <= 10^6.',
    solutionExplanation: 'Use interval DP. Let `dp[l][r]` be the best difference the current player can secure from subarray `l..r`. Then `dp[l][r] = max(coins[l] - dp[l+1][r], coins[r] - dp[l][r-1])`.',
    referenceSolutionJavascript: `
function solution(input) {
  const coins = input.coins;
  const n = coins.length;
  const dp = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) dp[i][i] = coins[i];
  for (let len = 2; len <= n; len++) {
    for (let left = 0; left + len - 1 < n; left++) {
      const right = left + len - 1;
      dp[left][right] = Math.max(coins[left] - dp[left + 1][right], coins[right] - dp[left][right - 1]);
    }
  }
  return dp[0][n - 1];
}`,
    difficulty: 'hard',
    tags: ['dynamic-programming', 'game-theory'],
    estimatedTimeMinutes: 20,
    ratingWeight: 2.2,
    timeLimitSeconds: 1200,
    testCases: [
      tc({ coins: [4,7,2] }, -1),
      tc({ coins: [5,3,7,10] }, 5),
      tc({ coins: [8] }, 8),
      tc({ coins: [1,100,3] }, -96, { hidden: true }),
      tc({ coins: [2,2,2,2] }, 0, { hidden: true }),
    ],
  }),
  problem({
    title: 'Mirzakhani\'s Museum Tour',
    scientist: 'Maryam Mirzakhani',
    shortStory: 'hallways form a directed acyclic route map, and the number of ways to reach the exit gallery must be counted.',
    problemStatement: 'Given a directed acyclic graph with `n` nodes labeled `0..n-1`, an array of edges `[from, to]`, a `start`, and an `end`, return the number of distinct directed paths from `start` to `end` modulo `1000000007`.',
    inputFormat: 'An object with `n` (integer), `edges` (array of pairs), `start` (integer), and `end` (integer).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= n <= 200000; 0 <= edges.length <= 300000; the graph is a DAG.',
    solutionExplanation: 'Topologically process the DAG. Track how many ways reach each node; propagate each count along outgoing edges. Because the graph is acyclic, every contribution is finalized when processed in topological order.',
    referenceSolutionJavascript: `
function solution(input) {
  const MOD = 1000000007;
  const { n, edges, start, end } = input;
  const graph = Array.from({ length: n }, () => []);
  const indeg = Array(n).fill(0);
  for (const [u, v] of edges) {
    graph[u].push(v);
    indeg[v]++;
  }
  const queue = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) queue.push(i);
  const ways = Array(n).fill(0);
  ways[start] = 1;
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    for (const next of graph[node]) {
      ways[next] = (ways[next] + ways[node]) % MOD;
      indeg[next]--;
      if (indeg[next] === 0) queue.push(next);
    }
  }
  return ways[end];
}`,
    difficulty: 'hard',
    tags: ['graphs', 'dynamic-programming', 'topological-sort'],
    estimatedTimeMinutes: 20,
    ratingWeight: 2.4,
    timeLimitSeconds: 1200,
    testCases: [
      tc({ n: 4, edges: [[0,1],[0,2],[1,3],[2,3]], start: 0, end: 3 }, 2),
      tc({ n: 5, edges: [[0,1],[1,2],[0,2],[2,4],[1,4]], start: 0, end: 4 }, 3),
      tc({ n: 3, edges: [[0,1]], start: 0, end: 2 }, 0),
      tc({ n: 1, edges: [], start: 0, end: 0 }, 1, { hidden: true }),
      tc({ n: 6, edges: [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,5]], start: 0, end: 5 }, 4, { hidden: true }),
    ],
  }),
  problem({
    title: 'Godel\'s Longest Brackets',
    scientist: 'Kurt Godel',
    shortStory: 'a proof fragment contains parentheses, and the longest valid contiguous region must be extracted by length.',
    problemStatement: 'Given a string `s` consisting only of `(` and `)`, return the length of the longest contiguous substring that forms a valid parentheses sequence.',
    inputFormat: 'An object with `s` (string).',
    outputFormat: 'Return a single integer.',
    constraintsText: '0 <= s.length <= 200000.',
    solutionExplanation: 'Use a stack of indices. Initialize it with `-1`. When you see `(` push its index. When you see `)`, pop. If the stack becomes empty, push the current index as a new base. Otherwise update the best length with the distance to the new top.',
    referenceSolutionJavascript: `
function solution(input) {
  const s = input.s;
  const stack = [-1];
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') {
      stack.push(i);
    } else {
      stack.pop();
      if (!stack.length) {
        stack.push(i);
      } else {
        best = Math.max(best, i - stack[stack.length - 1]);
      }
    }
  }
  return best;
}`,
    difficulty: 'hard',
    tags: ['strings', 'stack'],
    estimatedTimeMinutes: 20,
    ratingWeight: 2.1,
    timeLimitSeconds: 1200,
    testCases: [
      tc({ s: '(()' }, 2),
      tc({ s: ')()())' }, 4),
      tc({ s: '' }, 0),
      tc({ s: '((()))()' }, 8, { hidden: true }),
      tc({ s: '())((())' }, 4, { hidden: true }),
    ],
  }),
  problem({
    title: 'Bardeen\'s Charge Network',
    scientist: 'John Bardeen',
    shortStory: 'an undirected weighted network must be connected with the minimum possible total cable cost.',
    problemStatement: 'Given `n` nodes labeled `0..n-1` and an array of undirected weighted edges `[u, v, w]`, return the total weight of a minimum spanning tree. If the graph is disconnected, return `-1`.',
    inputFormat: 'An object with `n` (integer) and `edges` (array of triples).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= n <= 200000; 0 <= edges.length <= 300000; 0 <= w <= 10^9.',
    solutionExplanation: 'Sort edges by weight and run Kruskal\'s algorithm using a disjoint-set union structure. Add an edge only if it connects two currently separate components.',
    referenceSolutionJavascript: `
class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = Array(n).fill(1);
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    a = this.find(a);
    b = this.find(b);
    if (a === b) return false;
    if (this.size[a] < this.size[b]) [a, b] = [b, a];
    this.parent[b] = a;
    this.size[a] += this.size[b];
    return true;
  }
}

function solution(input) {
  const { n, edges } = input;
  const sorted = [...edges].sort((a, b) => a[2] - b[2]);
  const dsu = new DSU(n);
  let used = 0;
  let total = 0;
  for (const [u, v, w] of sorted) {
    if (dsu.union(u, v)) {
      total += w;
      used++;
      if (used === n - 1) return total;
    }
  }
  return n <= 1 ? 0 : -1;
}`,
    difficulty: 'hard',
    tags: ['graphs', 'greedy', 'disjoint-set'],
    estimatedTimeMinutes: 20,
    ratingWeight: 2.3,
    timeLimitSeconds: 1200,
    testCases: [
      tc({ n: 4, edges: [[0,1,1],[1,2,2],[0,2,5],[2,3,1]] }, 4),
      tc({ n: 3, edges: [[0,1,7]] }, -1),
      tc({ n: 1, edges: [] }, 0),
      tc({ n: 5, edges: [[0,1,1],[1,2,1],[2,3,1],[3,4,1],[0,4,10],[1,4,3]] }, 4, { hidden: true }),
      tc({ n: 4, edges: [[0,1,4],[0,2,3],[1,2,2],[2,3,5],[1,3,6]] }, 10, { hidden: true }),
    ],
  }),
  problem({
    title: 'Alhazen\'s Mirror Cuts',
    scientist: 'Ibn al-Haytham',
    shortStory: 'a reflective inscription must be divided into the fewest palindromic fragments.',
    problemStatement: 'Given a string `s`, return the minimum number of cuts needed so that every resulting substring is a palindrome.',
    inputFormat: 'An object with `s` (string).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= s.length <= 2000.',
    solutionExplanation: 'Precompute which substrings are palindromes with dynamic programming, then compute `dp[i]`, the minimum cuts needed for prefix `s[0..i]`.',
    referenceSolutionJavascript: `
function solution(input) {
  const s = input.s;
  const n = s.length;
  const pal = Array.from({ length: n }, () => Array(n).fill(false));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = i; j < n; j++) {
      if (s[i] === s[j] && (j - i <= 2 || pal[i + 1][j - 1])) {
        pal[i][j] = true;
      }
    }
  }
  const dp = Array(n).fill(Infinity);
  for (let i = 0; i < n; i++) {
    if (pal[0][i]) {
      dp[i] = 0;
      continue;
    }
    for (let j = 1; j <= i; j++) {
      if (pal[j][i]) dp[i] = Math.min(dp[i], dp[j - 1] + 1);
    }
  }
  return dp[n - 1];
}`,
    difficulty: 'hard',
    tags: ['dynamic-programming', 'strings'],
    estimatedTimeMinutes: 20,
    ratingWeight: 2.2,
    timeLimitSeconds: 1200,
    testCases: [
      tc({ s: 'aab' }, 1),
      tc({ s: 'racecar' }, 0),
      tc({ s: 'abccbc' }, 2),
      tc({ s: 'banana' }, 1, { hidden: true }),
      tc({ s: 'abcdef' }, 5, { hidden: true }),
    ],
  }),
  problem({
    title: 'Sutherland\'s Cooling Queue',
    scientist: 'Ivan Sutherland',
    shortStory: 'render tasks of named types must be scheduled with cooling gaps before the same type can run again.',
    problemStatement: 'Given an array `tasks` of uppercase letters and an integer `cooldown`, return the minimum number of time slots needed to finish all tasks if the same task type must be separated by at least `cooldown` idle or busy slots.',
    inputFormat: 'An object with `tasks` (string array of single letters) and `cooldown` (integer).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= tasks.length <= 200000; 0 <= cooldown <= 100000.',
    solutionExplanation: 'Let `maxFreq` be the highest task frequency and `countMax` be how many task types reach it. The optimal schedule length is `max(tasks.length, (maxFreq - 1) * (cooldown + 1) + countMax)`.',
    referenceSolutionJavascript: `
function solution(input) {
  const freq = new Map();
  for (const task of input.tasks) freq.set(task, (freq.get(task) || 0) + 1);
  let maxFreq = 0;
  let countMax = 0;
  for (const count of freq.values()) {
    if (count > maxFreq) {
      maxFreq = count;
      countMax = 1;
    } else if (count === maxFreq) {
      countMax++;
    }
  }
  return Math.max(input.tasks.length, (maxFreq - 1) * (input.cooldown + 1) + countMax);
}`,
    difficulty: 'hard',
    tags: ['greedy', 'hash-map'],
    estimatedTimeMinutes: 20,
    ratingWeight: 2.1,
    timeLimitSeconds: 1200,
    testCases: [
      tc({ tasks: ['A','A','A','B','B','B'], cooldown: 2 }, 8),
      tc({ tasks: ['A','B','C'], cooldown: 3 }, 3),
      tc({ tasks: ['A','A','A','A'], cooldown: 1 }, 7),
      tc({ tasks: ['A','A','B','B','C','C'], cooldown: 2 }, 6, { hidden: true }),
      tc({ tasks: ['Z'], cooldown: 100 }, 1, { hidden: true }),
    ],
  }),
  problem({
    title: 'Jemison\'s Portal Jumps',
    scientist: 'Mae Jemison',
    shortStory: 'a mission line includes portal links that can be used instantly, and the fewest jumps to the destination are required.',
    problemStatement: 'Given an array `nums` where from index `i` you may jump to `i - 1`, `i + 1`, or any other index `j` with `nums[j] = nums[i]`, return the minimum number of jumps needed to move from index `0` to index `n - 1`.',
    inputFormat: 'An object with `nums` (integer array).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= nums.length <= 200000; -10^9 <= nums[i] <= 10^9.',
    solutionExplanation: 'Build a map from value to all indices with that value. Then run BFS from index 0. After using the same-value edges for one value once, clear that list to avoid repeated expensive scans.',
    referenceSolutionJavascript: `
function solution(input) {
  const nums = input.nums;
  const n = nums.length;
  if (n === 1) return 0;
  const byValue = new Map();
  for (let i = 0; i < n; i++) {
    if (!byValue.has(nums[i])) byValue.set(nums[i], []);
    byValue.get(nums[i]).push(i);
  }
  const queue = [[0, 0]];
  const seen = Array(n).fill(false);
  seen[0] = true;
  for (let head = 0; head < queue.length; head++) {
    const [idx, dist] = queue[head];
    const nexts = byValue.get(nums[idx]) || [];
    nexts.push(idx - 1, idx + 1);
    for (const next of nexts) {
      if (next < 0 || next >= n || seen[next]) continue;
      if (next === n - 1) return dist + 1;
      seen[next] = true;
      queue.push([next, dist + 1]);
    }
    byValue.set(nums[idx], []);
  }
  return -1;
}`,
    difficulty: 'hard',
    tags: ['graphs', 'bfs', 'arrays', 'hash-map'],
    estimatedTimeMinutes: 20,
    ratingWeight: 2.4,
    timeLimitSeconds: 1200,
    testCases: [
      tc({ nums: [7,6,9,6,9,6,9,7] }, 1),
      tc({ nums: [1,2,3,4] }, 3),
      tc({ nums: [5] }, 0),
      tc({ nums: [11,22,7,7,7,22,11] }, 1, { hidden: true }),
      tc({ nums: [3,4,3,4,3,4,9] }, 3, { hidden: true }),
    ],
  }),
];
