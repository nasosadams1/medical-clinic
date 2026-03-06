import { problem, tc } from './duel-problem-utils.js';

export const mediumDuelProblems = [
  problem({
    title: 'Noether\'s Balanced Shift',
    scientist: 'Emmy Noether',
    shortStory: 'a rotor string is considered stable only when every opening marker is matched in the correct order.',
    problemStatement: 'Given a string `s` containing only the characters `(`, `)`, `[`, `]`, `{`, and `}`, determine whether it is balanced.',
    inputFormat: 'An object with `s` (string).',
    outputFormat: 'Return `true` if the string is balanced, otherwise return `false`.',
    constraintsText: '1 <= s.length <= 200000.',
    solutionExplanation: 'Use a stack. Push opening brackets, and for each closing bracket verify it matches the latest opening bracket. The string is balanced only if every closing bracket matches and the stack is empty at the end.',
    referenceSolutionJavascript: `
function solution(input) {
  const s = input.s;
  const stack = [];
  const pairs = { ')': '(', ']': '[', '}': '{' };
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch);
    } else {
      if (stack.length === 0 || stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}`,
    difficulty: 'medium',
    tags: ['strings', 'stack'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.5,
    timeLimitSeconds: 600,
    testCases: [
      tc({ s: '([]{})' }, true),
      tc({ s: '([)]' }, false),
      tc({ s: '(((())))' }, true),
      tc({ s: '(()' }, false, { hidden: true }),
      tc({ s: '{[()()][]}' }, true, { hidden: true }),
    ],
  }),
  problem({
    title: 'Lovelace\'s Signal Groups',
    scientist: 'Ada Lovelace',
    shortStory: 'encoded signal words must be grouped by their rearranged letter pattern before the engine can process them.',
    problemStatement: 'Given an array of lowercase words, group together words that are anagrams of each other. Return the groups sorted by the smallest original index of a member, and keep the words inside each group in their original order.',
    inputFormat: 'An object with `words` (string array).',
    outputFormat: 'Return an array of string arrays.',
    constraintsText: '1 <= words.length <= 20000; 1 <= words[i].length <= 50.',
    solutionExplanation: 'Use the sorted letters of each word as a key in a hash map. Append each word to its group in scan order. Because groups are created when first seen, the final order already matches the required tie-break rule.',
    referenceSolutionJavascript: `
function solution(input) {
  const groups = new Map();
  for (const word of input.words) {
    const key = word.split('').sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return Array.from(groups.values());
}`,
    difficulty: 'medium',
    tags: ['strings', 'hash-map'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.5,
    timeLimitSeconds: 600,
    testCases: [
      tc({ words: ['code', 'deco', 'node', 'done', 'leaf'] }, [['code', 'deco'], ['node', 'done'], ['leaf']]),
      tc({ words: ['rat', 'tar', 'art'] }, [['rat', 'tar', 'art']]),
      tc({ words: ['ab', 'ba', 'abc', 'cab', 'bca'] }, [['ab', 'ba'], ['abc', 'cab', 'bca']]),
      tc({ words: ['x'] }, [['x']], { hidden: true }),
      tc({ words: ['dust', 'stud', 'tuds', 'note'] }, [['dust', 'stud', 'tuds'], ['note']], { hidden: true }),
    ],
  }),
  problem({
    title: 'Huygens\' Orbit Window',
    scientist: 'Christiaan Huygens',
    shortStory: 'a telescope must be pointed during the brightest consecutive block of observations of fixed length.',
    problemStatement: 'Given an integer array `nums` and an integer `k`, return the maximum sum of any contiguous subarray of length `k`.',
    inputFormat: 'An object with `nums` (integer array) and `k` (integer).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= k <= nums.length <= 200000; -100000 <= nums[i] <= 100000.',
    solutionExplanation: 'Compute the sum of the first window, then slide the window by subtracting the outgoing value and adding the incoming one. Track the maximum seen.',
    referenceSolutionJavascript: `
function solution(input) {
  const { nums, k } = input;
  let window = 0;
  for (let i = 0; i < k; i++) window += nums[i];
  let best = window;
  for (let i = k; i < nums.length; i++) {
    window += nums[i] - nums[i - k];
    if (window > best) best = window;
  }
  return best;
}`,
    difficulty: 'medium',
    tags: ['arrays', 'sliding-window'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.5,
    timeLimitSeconds: 600,
    testCases: [
      tc({ nums: [4, 2, 7, 1, 8], k: 2 }, 9),
      tc({ nums: [-3, -2, -5, -1], k: 2 }, -5),
      tc({ nums: [5, 5, 5], k: 3 }, 15),
      tc({ nums: [1, 9, 2, 8, 3, 7], k: 3 }, 19, { hidden: true }),
      tc({ nums: [10], k: 1 }, 10, { hidden: true }),
    ],
  }),
  problem({
    title: 'Wu\'s Frequency Ledger',
    scientist: 'Chien-Shiung Wu',
    shortStory: 'the lab wants the number that appears most often, breaking ties toward the smaller value.',
    problemStatement: 'Given an integer array `nums`, return the value with the highest frequency. If several values share the highest frequency, return the smallest one among them.',
    inputFormat: 'An object with `nums` (integer array).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= nums.length <= 200000; -100000 <= nums[i] <= 100000.',
    solutionExplanation: 'Count frequencies in a hash map. Scan the map and keep the value with the largest frequency, using the smaller value as the tie-breaker.',
    referenceSolutionJavascript: `
function solution(input) {
  const freq = new Map();
  for (const value of input.nums) {
    freq.set(value, (freq.get(value) || 0) + 1);
  }
  let bestValue = null;
  let bestCount = -1;
  for (const [value, count] of freq.entries()) {
    if (count > bestCount || (count === bestCount && value < bestValue)) {
      bestCount = count;
      bestValue = value;
    }
  }
  return bestValue;
}`,
    difficulty: 'medium',
    tags: ['arrays', 'hash-map'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.5,
    timeLimitSeconds: 600,
    testCases: [
      tc({ nums: [4, 7, 4, 7, 4] }, 4),
      tc({ nums: [9, 2, 9, 2] }, 2),
      tc({ nums: [-1, -1, -2, -2, -2] }, -2),
      tc({ nums: [5] }, 5, { hidden: true }),
      tc({ nums: [8, 1, 8, 1, 3, 3, 3] }, 3, { hidden: true }),
    ],
  }),
  problem({
    title: 'Maxwell\'s Circular Watch',
    scientist: 'James Clerk Maxwell',
    shortStory: 'each reading on a circular dial must find the next stronger reading that appears when the dial continues around.',
    problemStatement: 'Given a circular integer array `nums`, return an array where each position stores the next greater value encountered when moving right around the circle. If no greater value exists, store `-1`.',
    inputFormat: 'An object with `nums` (integer array).',
    outputFormat: 'Return an integer array.',
    constraintsText: '1 <= nums.length <= 200000; -100000 <= nums[i] <= 100000.',
    solutionExplanation: 'Use a monotonic decreasing stack of indices. Traverse the array twice; during the second pass you only resolve remaining indices, which simulates circular behavior.',
    referenceSolutionJavascript: `
function solution(input) {
  const nums = input.nums;
  const n = nums.length;
  const result = Array(n).fill(-1);
  const stack = [];
  for (let i = 0; i < 2 * n; i++) {
    const idx = i % n;
    while (stack.length && nums[stack[stack.length - 1]] < nums[idx]) {
      result[stack.pop()] = nums[idx];
    }
    if (i < n) stack.push(idx);
  }
  return result;
}`,
    difficulty: 'medium',
    tags: ['arrays', 'stack'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.5,
    timeLimitSeconds: 600,
    testCases: [
      tc({ nums: [2, 5, 1] }, [5, -1, 2]),
      tc({ nums: [7, 6, 5] }, [-1, 7, 7]),
      tc({ nums: [1, 2, 3, 4] }, [2, 3, 4, -1]),
      tc({ nums: [4] }, [-1], { hidden: true }),
      tc({ nums: [3, 1, 2, 1] }, [-1, 2, 3, 3], { hidden: true }),
    ],
  }),
  problem({
    title: 'Euler\'s Prime Burden',
    scientist: 'Leonhard Euler',
    shortStory: 'a machine\'s burden score equals the total number of prime factors in its calibration value, counting repetition.',
    problemStatement: 'Given a positive integer `n`, return how many prime factors it has when multiplicity is counted. For example, `12 = 2 * 2 * 3` has 3 prime factors.',
    inputFormat: 'An object with `n` (integer).',
    outputFormat: 'Return a single integer.',
    constraintsText: '2 <= n <= 10^12.',
    solutionExplanation: 'Repeatedly divide by each possible factor from 2 upward while the factor squared is at most the remaining number. Count each successful division. If a number greater than 1 remains, it is prime and contributes one more factor.',
    referenceSolutionJavascript: `
function solution(input) {
  let n = input.n;
  let count = 0;
  let factor = 2;
  while (factor * factor <= n) {
    while (n % factor === 0) {
      count++;
      n = Math.floor(n / factor);
    }
    factor += factor === 2 ? 1 : 2;
  }
  if (n > 1) count++;
  return count;
}`,
    difficulty: 'medium',
    tags: ['math', 'number-theory'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.6,
    timeLimitSeconds: 600,
    testCases: [
      tc({ n: 12 }, 3),
      tc({ n: 97 }, 1),
      tc({ n: 72 }, 5),
      tc({ n: 99991 }, 1, { hidden: true }),
      tc({ n: 3600 }, 8, { hidden: true }),
    ],
  }),
  problem({
    title: 'McClintock\'s Segment Merge',
    scientist: 'Barbara McClintock',
    shortStory: 'overlapping genome activity windows must be combined before they are archived.',
    problemStatement: 'Given an array of intervals `[start, end]`, merge all overlapping intervals and return the merged result sorted by start.',
    inputFormat: 'An object with `intervals` (array of integer pairs).',
    outputFormat: 'Return an array of integer pairs.',
    constraintsText: '1 <= intervals.length <= 200000; -10^9 <= start <= end <= 10^9.',
    solutionExplanation: 'Sort intervals by start, then scan from left to right. If the next interval overlaps the current merged interval, extend the end. Otherwise start a new merged interval.',
    referenceSolutionJavascript: `
function solution(input) {
  const intervals = [...input.intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const [start, end] of intervals) {
    if (!merged.length || start > merged[merged.length - 1][1]) {
      merged.push([start, end]);
    } else {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], end);
    }
  }
  return merged;
}`,
    difficulty: 'medium',
    tags: ['arrays', 'sorting', 'intervals'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.6,
    timeLimitSeconds: 600,
    testCases: [
      tc({ intervals: [[1, 3], [2, 5], [8, 9]] }, [[1, 5], [8, 9]], { compareMode: 'interval_set' }),
      tc({ intervals: [[4, 6], [1, 2], [2, 4]] }, [[1, 6]], { compareMode: 'interval_set' }),
      tc({ intervals: [[5, 7]] }, [[5, 7]], { compareMode: 'interval_set' }),
      tc({ intervals: [[-3, -1], [-2, 2], [5, 8]] }, [[-3, 2], [5, 8]], { hidden: true, compareMode: 'interval_set' }),
      tc({ intervals: [[1, 4], [6, 8], [7, 10]] }, [[1, 4], [6, 10]], { hidden: true, compareMode: 'interval_set' }),
    ],
  }),
  problem({
    title: 'Shannon\'s Rare Signal',
    scientist: 'Claude Shannon',
    shortStory: 'a signal stream is clean only when the longest block without repeated symbols is identified.',
    problemStatement: 'Given a string `s`, return the length of the longest substring that contains no repeated characters.',
    inputFormat: 'An object with `s` (string).',
    outputFormat: 'Return a single integer.',
    constraintsText: '0 <= s.length <= 200000.',
    solutionExplanation: 'Use a sliding window with a hash map from character to last seen index. Move the left boundary past the last occurrence whenever a duplicate appears.',
    referenceSolutionJavascript: `
function solution(input) {
  const s = input.s;
  const last = new Map();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (last.has(ch) && last.get(ch) >= left) {
      left = last.get(ch) + 1;
    }
    last.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
    difficulty: 'medium',
    tags: ['strings', 'sliding-window', 'hash-map'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.6,
    timeLimitSeconds: 600,
    testCases: [
      tc({ s: 'abcaef' }, 5),
      tc({ s: 'bbbb' }, 1),
      tc({ s: '' }, 0),
      tc({ s: 'pqrspqt' }, 5, { hidden: true }),
      tc({ s: 'dvdf' }, 3, { hidden: true }),
    ],
  }),
  problem({
    title: 'Bernoulli\'s Broken Stairs',
    scientist: 'Jacob Bernoulli',
    shortStory: 'a staircase can be climbed in one-step or two-step moves, but some steps are blocked by loose equipment.',
    problemStatement: 'Given `n` steps and an array `blocked` listing forbidden steps, count how many ways there are to reach step `n` from step `0` using moves of size 1 or 2. Return the result modulo `1000000007`.',
    inputFormat: 'An object with `n` (integer) and `blocked` (integer array).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= n <= 200000; 0 <= blocked.length <= n.',
    solutionExplanation: 'Dynamic programming works because the number of ways to reach a step equals the sum of the ways to reach the previous one and the one before it, unless the step is blocked.',
    referenceSolutionJavascript: `
function solution(input) {
  const MOD = 1000000007;
  const blocked = new Set(input.blocked);
  const n = input.n;
  const dp = Array(n + 1).fill(0);
  dp[0] = blocked.has(0) ? 0 : 1;
  for (let i = 1; i <= n; i++) {
    if (blocked.has(i)) {
      dp[i] = 0;
      continue;
    }
    dp[i] = dp[i - 1];
    if (i >= 2) dp[i] = (dp[i] + dp[i - 2]) % MOD;
  }
  return dp[n];
}`,
    difficulty: 'medium',
    tags: ['dynamic-programming'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.7,
    timeLimitSeconds: 600,
    testCases: [
      tc({ n: 4, blocked: [] }, 5),
      tc({ n: 4, blocked: [2] }, 1),
      tc({ n: 5, blocked: [3] }, 2),
      tc({ n: 1, blocked: [1] }, 0, { hidden: true }),
      tc({ n: 7, blocked: [4, 6] }, 3, { hidden: true }),
    ],
  }),
  problem({
    title: 'Johnson\'s Safe Route',
    scientist: 'Katherine Johnson',
    shortStory: 'a shuttle planner needs the shortest path across a grid while avoiding blocked cells.',
    problemStatement: 'Given a grid of `0` and `1`, where `0` means open and `1` means blocked, find the length of the shortest path from the top-left cell to the bottom-right cell using only up, down, left, and right moves. If no path exists, return `-1`.',
    inputFormat: 'An object with `grid` (2D integer array).',
    outputFormat: 'Return a single integer path length counted in number of cells visited, including start and end.',
    constraintsText: '1 <= rows, cols <= 300.',
    solutionExplanation: 'Use BFS from the start cell. The first time the end cell is reached gives the shortest path length because each move has equal cost.',
    referenceSolutionJavascript: `
function solution(input) {
  const grid = input.grid;
  const rows = grid.length;
  const cols = grid[0].length;
  if (grid[0][0] === 1 || grid[rows - 1][cols - 1] === 1) return -1;
  const queue = [[0, 0, 1]];
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  seen[0][0] = true;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (let head = 0; head < queue.length; head++) {
    const [r, c, dist] = queue[head];
    if (r === rows - 1 && c === cols - 1) return dist;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      if (seen[nr][nc] || grid[nr][nc] === 1) continue;
      seen[nr][nc] = true;
      queue.push([nr, nc, dist + 1]);
    }
  }
  return -1;
}`,
    difficulty: 'medium',
    tags: ['graphs', 'bfs', 'grids'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.7,
    timeLimitSeconds: 600,
    testCases: [
      tc({ grid: [[0,0,0],[1,1,0],[0,0,0]] }, 5),
      tc({ grid: [[0,1],[1,0]] }, -1),
      tc({ grid: [[0]] }, 1),
      tc({ grid: [[0,0,1],[0,0,0],[1,0,0]] }, 5, { hidden: true }),
      tc({ grid: [[1]] }, -1, { hidden: true }),
    ],
  }),
  problem({
    title: 'Lamarr\'s Channel Groups',
    scientist: 'Hedy Lamarr',
    shortStory: 'devices sharing direct links belong to the same hopping group and must be counted.',
    problemStatement: 'Given `n` labeled devices `0..n-1` and an array of undirected edges, return the number of connected components in the graph.',
    inputFormat: 'An object with `n` (integer) and `edges` (array of integer pairs).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= n <= 200000; 0 <= edges.length <= 200000.',
    solutionExplanation: 'Build adjacency lists and run DFS or BFS from every unvisited node. Each new traversal starts a new connected component.',
    referenceSolutionJavascript: `
function solution(input) {
  const { n, edges } = input;
  const graph = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);
  }
  const seen = Array(n).fill(false);
  let groups = 0;
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    groups++;
    const stack = [i];
    seen[i] = true;
    while (stack.length) {
      const node = stack.pop();
      for (const next of graph[node]) {
        if (!seen[next]) {
          seen[next] = true;
          stack.push(next);
        }
      }
    }
  }
  return groups;
}`,
    difficulty: 'medium',
    tags: ['graphs', 'dfs'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.7,
    timeLimitSeconds: 600,
    testCases: [
      tc({ n: 5, edges: [[0,1],[1,2],[3,4]] }, 2),
      tc({ n: 4, edges: [] }, 4),
      tc({ n: 3, edges: [[0,1],[1,2]] }, 1),
      tc({ n: 6, edges: [[0,1],[2,3],[4,5]] }, 3, { hidden: true }),
      tc({ n: 1, edges: [] }, 1, { hidden: true }),
    ],
  }),
  problem({
    title: 'Chandrasekhar\'s Dock Schedule',
    scientist: 'Subrahmanyan Chandrasekhar',
    shortStory: 'arrival windows for cargo pods must be assigned to the fewest docking ports.',
    problemStatement: 'Given an array of intervals `[start, end]`, return the minimum number of ports needed so that no overlapping intervals share a port. Intervals that end at time `t` do not overlap intervals that start at time `t`.',
    inputFormat: 'An object with `intervals` (array of integer pairs).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= intervals.length <= 200000; -10^9 <= start <= end <= 10^9.',
    solutionExplanation: 'Sort intervals by start time. Track current end times in a min-heap; when the earliest finishing interval ends before the next one starts, reuse that port, otherwise allocate a new port.',
    referenceSolutionJavascript: `
class MinHeap {
  constructor() { this.data = []; }
  peek() { return this.data[0]; }
  push(value) {
    this.data.push(value);
    let i = this.data.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.data[p] <= this.data[i]) break;
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
        let smallest = i;
        if (left < this.data.length && this.data[left] < this.data[smallest]) smallest = left;
        if (right < this.data.length && this.data[right] < this.data[smallest]) smallest = right;
        if (smallest === i) break;
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      }
    }
    return top;
  }
  size() { return this.data.length; }
}

function solution(input) {
  const intervals = [...input.intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const heap = new MinHeap();
  let best = 0;
  for (const [start, end] of intervals) {
    while (heap.size() && heap.peek() <= start) heap.pop();
    heap.push(end);
    if (heap.size() > best) best = heap.size();
  }
  return best;
}`,
    difficulty: 'medium',
    tags: ['greedy', 'heap', 'intervals'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.8,
    timeLimitSeconds: 600,
    testCases: [
      tc({ intervals: [[1,4],[2,5],[7,9]] }, 2),
      tc({ intervals: [[1,2],[2,3],[3,4]] }, 1),
      tc({ intervals: [[0,10],[1,3],[2,4],[5,8]] }, 3),
      tc({ intervals: [[5,7]] }, 1, { hidden: true }),
      tc({ intervals: [[1,6],[2,7],[3,8],[4,9]] }, 4, { hidden: true }),
    ],
  }),
  problem({
    title: 'Leavitt\'s Brightness Order',
    scientist: 'Henrietta Swan Leavitt',
    shortStory: 'measurement values must be sorted by how often they appear, with ties broken by the value itself.',
    problemStatement: 'Given an integer array `nums`, return a new array sorted by increasing frequency. If two values have the same frequency, place the larger value first.',
    inputFormat: 'An object with `nums` (integer array).',
    outputFormat: 'Return an integer array.',
    constraintsText: '1 <= nums.length <= 100000; -100 <= nums[i] <= 100.',
    solutionExplanation: 'Count frequencies, then sort the values using a comparator based on frequency ascending and value descending.',
    referenceSolutionJavascript: `
function solution(input) {
  const freq = new Map();
  for (const value of input.nums) {
    freq.set(value, (freq.get(value) || 0) + 1);
  }
  return [...input.nums].sort((a, b) => {
    const fa = freq.get(a);
    const fb = freq.get(b);
    if (fa !== fb) return fa - fb;
    return b - a;
  });
}`,
    difficulty: 'medium',
    tags: ['arrays', 'sorting', 'hash-map'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.5,
    timeLimitSeconds: 600,
    testCases: [
      tc({ nums: [3,3,1,2,2,2] }, [1,3,3,2,2,2]),
      tc({ nums: [4,4,5,5] }, [5,5,4,4]),
      tc({ nums: [7] }, [7]),
      tc({ nums: [9,8,9,8,7] }, [7,9,9,8,8], { hidden: true }),
      tc({ nums: [-1,-1,-2,-2,-2,3] }, [3,-1,-1,-2,-2,-2], { hidden: true }),
    ],
  }),
  problem({
    title: 'Hawking\'s Reverse Stack',
    scientist: 'Stephen Hawking',
    shortStory: 'a compact expression from a simulation must be evaluated in reverse polish notation.',
    problemStatement: 'Given an array of tokens representing a valid reverse polish expression, evaluate it. The operators are `+`, `-`, `*`, and `/`, and division truncates toward zero.',
    inputFormat: 'An object with `tokens` (string array).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= tokens.length <= 100000; the expression is valid and intermediate results fit in 32-bit signed integers.',
    solutionExplanation: 'Use a stack. Push numbers. On an operator, pop the top two values, apply the operation in the correct order, and push the result back.',
    referenceSolutionJavascript: `
function solution(input) {
  const stack = [];
  for (const token of input.tokens) {
    if (token === '+' || token === '-' || token === '*' || token === '/') {
      const b = stack.pop();
      const a = stack.pop();
      if (token === '+') stack.push(a + b);
      else if (token === '-') stack.push(a - b);
      else if (token === '*') stack.push(a * b);
      else stack.push(Math.trunc(a / b));
    } else {
      stack.push(Number(token));
    }
  }
  return stack[0];
}`,
    difficulty: 'medium',
    tags: ['stack', 'math'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.6,
    timeLimitSeconds: 600,
    testCases: [
      tc({ tokens: ['2','1','+','3','*'] }, 9),
      tc({ tokens: ['8','3','/'] }, 2),
      tc({ tokens: ['5','1','2','+','4','*','+','3','-'] }, 14),
      tc({ tokens: ['7','-3','/'] }, -2, { hidden: true }),
      tc({ tokens: ['4','13','5','/','+'] }, 6, { hidden: true }),
    ],
  }),
  problem({
    title: 'Ride\'s Nested Archive',
    scientist: 'Sally Ride',
    shortStory: 'a nested research archive stores integer values inside arrays inside arrays, and the depth-weighted sum is needed.',
    problemStatement: 'Given a nested array where each element is either an integer or another nested array of the same form, return the depth-weighted sum. Integers at depth 1 contribute their value once, depth 2 contribute twice, and so on.',
    inputFormat: 'An object with `data` (nested arrays and integers).',
    outputFormat: 'Return a single integer.',
    constraintsText: 'The total number of integers and arrays is at most 100000; values fit in 32-bit signed integers.',
    solutionExplanation: 'Use recursion or an explicit stack. For each integer, add `value * depth`. For each nested array, recurse with depth + 1.',
    referenceSolutionJavascript: `
function dfs(node, depth) {
  let total = 0;
  for (const item of node) {
    if (Array.isArray(item)) total += dfs(item, depth + 1);
    else total += item * depth;
  }
  return total;
}

function solution(input) {
  return dfs(input.data, 1);
}`,
    difficulty: 'medium',
    tags: ['recursion', 'arrays'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.7,
    timeLimitSeconds: 600,
    testCases: [
      tc({ data: [1, [2, 3]] }, 11),
      tc({ data: [[1], [2, [3]]] }, 15),
      tc({ data: [] }, 0),
      tc({ data: [5, [1, [2]]] }, 13, { hidden: true }),
      tc({ data: [[[[4]]]] }, 16, { hidden: true }),
    ],
  }),
  problem({
    title: 'Moser\'s Rescue Boats',
    scientist: 'Maria Gaetana Agnesi Moser',
    shortStory: 'each rescue boat can carry at most two people without exceeding a weight limit.',
    problemStatement: 'Given an array `people` of weights and an integer `limit`, return the minimum number of boats required if each boat carries at most two people and the total weight on a boat cannot exceed `limit`.',
    inputFormat: 'An object with `people` (integer array) and `limit` (integer).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= people.length <= 200000; 1 <= people[i] <= limit <= 10^9.',
    solutionExplanation: 'Sort the weights. Pair the lightest remaining person with the heaviest remaining person whenever possible; otherwise the heaviest person goes alone. This greedy strategy is optimal.',
    referenceSolutionJavascript: `
function solution(input) {
  const people = [...input.people].sort((a, b) => a - b);
  let left = 0;
  let right = people.length - 1;
  let boats = 0;
  while (left <= right) {
    if (people[left] + people[right] <= input.limit) left++;
    right--;
    boats++;
  }
  return boats;
}`,
    difficulty: 'medium',
    tags: ['greedy', 'sorting'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.6,
    timeLimitSeconds: 600,
    testCases: [
      tc({ people: [3,2,2,1], limit: 3 }, 3),
      tc({ people: [4,4,4], limit: 4 }, 3),
      tc({ people: [1,2], limit: 3 }, 1),
      tc({ people: [2,3,4,5], limit: 5 }, 3, { hidden: true }),
      tc({ people: [5], limit: 7 }, 1, { hidden: true }),
    ],
  }),
  problem({
    title: 'Al-Khwarizmi\'s Divisible Pairs',
    scientist: 'Al-Khwarizmi',
    shortStory: 'a ledger counts how many pairs of values combine to a total divisible by a chosen modulus.',
    problemStatement: 'Given an integer array `nums` and an integer `k`, count how many pairs `(i, j)` with `i < j` satisfy `(nums[i] + nums[j]) % k = 0`.',
    inputFormat: 'An object with `nums` (integer array) and `k` (integer).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= nums.length <= 200000; 1 <= k <= 100000; -10^9 <= nums[i] <= 10^9.',
    solutionExplanation: 'Track how many previous numbers have each remainder modulo `k`. For the current value, the needed remainder is `(k - r) % k`. Add that count to the answer, then record the current remainder.',
    referenceSolutionJavascript: `
function solution(input) {
  const { nums, k } = input;
  const count = new Map();
  let answer = 0;
  for (const value of nums) {
    const r = ((value % k) + k) % k;
    const need = (k - r) % k;
    answer += count.get(need) || 0;
    count.set(r, (count.get(r) || 0) + 1);
  }
  return answer;
}`,
    difficulty: 'medium',
    tags: ['arrays', 'hash-map', 'math'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.7,
    timeLimitSeconds: 600,
    testCases: [
      tc({ nums: [1,2,3,4,5], k: 3 }, 4),
      tc({ nums: [2,2,2], k: 4 }, 3),
      tc({ nums: [5,-1,7], k: 6 }, 2),
      tc({ nums: [0,0,0,0], k: 5 }, 6, { hidden: true }),
      tc({ nums: [1,1,1,1], k: 2 }, 6, { hidden: true }),
    ],
  }),
  problem({
    title: 'Burnell\'s Island Count',
    scientist: 'Jocelyn Bell Burnell',
    shortStory: 'clusters of active cells in a sky map must be counted as separate islands of signal.',
    problemStatement: 'Given a grid of `0` and `1`, count how many connected groups of `1` cells exist using four-directional adjacency.',
    inputFormat: 'An object with `grid` (2D integer array).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= rows, cols <= 300.',
    solutionExplanation: 'Traverse the grid. Whenever an unvisited land cell is found, start a DFS or BFS to mark its full component, then increment the island count.',
    referenceSolutionJavascript: `
function solution(input) {
  const grid = input.grid.map((row) => [...row]);
  const rows = grid.length;
  const cols = grid[0].length;
  let islands = 0;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 1) continue;
      islands++;
      const stack = [[r, c]];
      grid[r][c] = 0;
      while (stack.length) {
        const [cr, cc] = stack.pop();
        for (const [dr, dc] of dirs) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          if (grid[nr][nc] !== 1) continue;
          grid[nr][nc] = 0;
          stack.push([nr, nc]);
        }
      }
    }
  }
  return islands;
}`,
    difficulty: 'medium',
    tags: ['graphs', 'dfs', 'grids'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.7,
    timeLimitSeconds: 600,
    testCases: [
      tc({ grid: [[1,1,0],[0,1,0],[1,0,1]] }, 3),
      tc({ grid: [[0,0],[0,0]] }, 0),
      tc({ grid: [[1]] }, 1),
      tc({ grid: [[1,0,1,0],[1,0,0,1],[0,0,1,1]] }, 3, { hidden: true }),
      tc({ grid: [[1,1],[1,1]] }, 1, { hidden: true }),
    ],
  }),
  problem({
    title: 'Babbage\'s Divisor Sweep',
    scientist: 'Charles Babbage',
    shortStory: 'a mechanical table can only be printed after every positive divisor of a number is listed in increasing order.',
    problemStatement: 'Given a positive integer `n`, return all of its positive divisors in increasing order.',
    inputFormat: 'An object with `n` (integer).',
    outputFormat: 'Return an integer array sorted in increasing order.',
    constraintsText: '1 <= n <= 10^12.',
    solutionExplanation: 'Scan possible divisors from 1 up to the square root of `n`. Whenever `d` divides `n`, record both `d` and `n / d`. Keep small divisors in one array and large divisors in another, then reverse the large-divisor array and append it.',
    referenceSolutionJavascript: `
function solution(input) {
  const n = input.n;
  const small = [];
  const large = [];
  let d = 1;
  while (d * d <= n) {
    if (n % d === 0) {
      small.push(d);
      if (d * d !== n) large.push(Math.floor(n / d));
    }
    d++;
  }
  large.reverse();
  return small.concat(large);
}`,
    difficulty: 'medium',
    tags: ['math', 'number-theory'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.6,
    timeLimitSeconds: 600,
    testCases: [
      tc({ n: 1 }, [1]),
      tc({ n: 12 }, [1, 2, 3, 4, 6, 12]),
      tc({ n: 49 }, [1, 7, 49]),
      tc({ n: 18 }, [1, 2, 3, 6, 9, 18], { hidden: true }),
      tc({ n: 97 }, [1, 97], { hidden: true }),
    ],
  }),
  problem({
    title: 'Franklin\'s Coin Planner',
    scientist: 'Rosalind Franklin',
    shortStory: 'a lab machine must be paid exactly using the smallest number of token denominations.',
    problemStatement: 'Given an array `coins` of positive integers and an integer `amount`, return the minimum number of coins needed to make exactly `amount`. If it is impossible, return `-1`.',
    inputFormat: 'An object with `coins` (integer array) and `amount` (integer).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= coins.length <= 100; 1 <= coins[i] <= 10000; 0 <= amount <= 100000.',
    solutionExplanation: 'Use dynamic programming where `dp[x]` stores the fewest coins needed for amount `x`. Update each amount from previous reachable amounts.',
    referenceSolutionJavascript: `
function solution(input) {
  const { coins, amount } = input;
  const INF = amount + 1;
  const dp = Array(amount + 1).fill(INF);
  dp[0] = 0;
  for (const coin of coins) {
    for (let x = coin; x <= amount; x++) {
      dp[x] = Math.min(dp[x], dp[x - coin] + 1);
    }
  }
  return dp[amount] === INF ? -1 : dp[amount];
}`,
    difficulty: 'medium',
    tags: ['dynamic-programming'],
    estimatedTimeMinutes: 10,
    ratingWeight: 1.8,
    timeLimitSeconds: 600,
    testCases: [
      tc({ coins: [1,3,4], amount: 6 }, 2),
      tc({ coins: [2], amount: 3 }, -1),
      tc({ coins: [5,7], amount: 0 }, 0),
      tc({ coins: [2,5,10], amount: 27 }, 4, { hidden: true }),
      tc({ coins: [9,6,5,1], amount: 11 }, 2, { hidden: true }),
    ],
  }),
];




