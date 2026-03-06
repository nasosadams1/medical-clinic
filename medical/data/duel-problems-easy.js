import { problem, tc } from './duel-problem-utils.js';

export const easyDuelProblems = [
  problem({
    title: 'Curie\'s Cold Notes',
    scientist: 'Marie Curie',
    shortStory: 'each recorded temperature below a safety limit must be counted before a sample can be moved.',
    problemStatement: 'You are given an array of integer temperatures and an integer limit. Count how many temperatures are strictly smaller than the limit.',
    inputFormat: 'An object with `temps` (integer array) and `limit` (integer).',
    outputFormat: 'Return a single integer.',
    constraintsText: '1 <= temps.length <= 100000; -100000 <= temps[i], limit <= 100000.',
    solutionExplanation: 'Scan the array once and increment a counter whenever a value is below the limit. This is linear in the number of readings.',
    referenceSolutionJavascript: `
function solution(input) {
  const { temps, limit } = input;
  let count = 0;
  for (const value of temps) {
    if (value < limit) count++;
  }
  return count;
}`,
    difficulty: 'easy',
    tags: ['arrays', 'counting'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ temps: [3, -1, 8, 2], limit: 3 }, 2),
      tc({ temps: [5, 5, 5], limit: 5 }, 0),
      tc({ temps: [-4, -3, -2], limit: -1 }, 3),
      tc({ temps: [10], limit: 0 }, 0, { hidden: true }),
      tc({ temps: [7, 1, 7, 1, 7], limit: 2 }, 2, { hidden: true }),
    ],
  }),
  problem({
    title: 'Hopper\'s Packet Pair',
    scientist: 'Grace Hopper',
    shortStory: 'two packet sizes must be found quickly so their combined length matches the decoder target.',
    problemStatement: 'Given an array `nums` and an integer `target`, return the first pair of indices `[i, j]` with `i < j` such that `nums[i] + nums[j] = target`. If multiple answers exist, choose the one with the smallest `j`, then the smallest `i`.',
    inputFormat: 'An object with `nums` (integer array) and `target` (integer).',
    outputFormat: 'Return an array `[i, j]`.',
    constraintsText: '2 <= nums.length <= 100000; exactly one valid pair exists.',
    solutionExplanation: 'Use a hash map from value to earliest index. For each position, check whether the complement already exists. Because you scan left to right and only store the first occurrence, the tie-breaking rule is satisfied.',
    referenceSolutionJavascript: `
function solution(input) {
  const { nums, target } = input;
  const seen = new Map();
  for (let j = 0; j < nums.length; j++) {
    const need = target - nums[j];
    if (seen.has(need)) return [seen.get(need), j];
    if (!seen.has(nums[j])) seen.set(nums[j], j);
  }
  return [];
}`,
    difficulty: 'easy',
    tags: ['arrays', 'hash-map'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ nums: [4, 9, 1, 6], target: 10 }, null, { validator: 'two_sum' }),
      tc({ nums: [2, 8, 2, 5], target: 10 }, null, { validator: 'two_sum' }),
      tc({ nums: [7, 3, 4, 3], target: 6 }, null, { validator: 'two_sum' }),
      tc({ nums: [-2, 11, 5, 8], target: 6 }, null, { hidden: true, validator: 'two_sum' }),
      tc({ nums: [1, 4, 6, 9], target: 13 }, null, { hidden: true, validator: 'two_sum' }),
    ],
  }),
  problem({
    title: 'Kepler\'s Mirror Label',
    scientist: 'Johannes Kepler',
    shortStory: 'a telescope label is accepted only if it reads the same forward and backward after non-letter symbols are ignored.',
    problemStatement: 'Given a string `text`, determine whether it is a palindrome after converting letters to lowercase and removing every character that is not a letter or digit.',
    inputFormat: 'An object with `text` (string).',
    outputFormat: 'Return `true` or `false`.',
    constraintsText: '1 <= text.length <= 200000.',
    solutionExplanation: 'Build two pointers, skip non-alphanumeric characters, and compare lowercase characters as you move inward.',
    referenceSolutionJavascript: `
function solution(input) {
  const s = input.text;
  let left = 0;
  let right = s.length - 1;
  const isAlphaNum = (ch) => /[a-z0-9]/i.test(ch);
  while (left < right) {
    while (left < right && !isAlphaNum(s[left])) left++;
    while (left < right && !isAlphaNum(s[right])) right--;
    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
    left++;
    right--;
  }
  return true;
}`,
    difficulty: 'easy',
    tags: ['strings', 'two-pointers'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ text: 'Rotor' }, true),
      tc({ text: 'Lab, bal!' }, true),
      tc({ text: 'planet' }, false),
      tc({ text: 'A man, a plan, a canal: Panama' }, true, { hidden: true }),
      tc({ text: '0P' }, false, { hidden: true }),
    ],
  }),
  problem({
    title: 'Franklin\'s Signal Majority',
    scientist: 'Rosalind Franklin',
    shortStory: 'the most common signal value must be reported, and ties are broken by the smaller value to keep the log deterministic.',
    problemStatement: 'Given an array of integers, return the value that appears most often. If several values share the maximum frequency, return the smallest such value.',
    inputFormat: 'An object with `values` (integer array).',
    outputFormat: 'Return one integer.',
    constraintsText: '1 <= values.length <= 100000.',
    solutionExplanation: 'Count frequencies with a map while tracking the current best value and best frequency.',
    referenceSolutionJavascript: `
function solution(input) {
  const counts = new Map();
  let bestValue = Infinity;
  let bestCount = -1;
  for (const value of input.values) {
    const next = (counts.get(value) || 0) + 1;
    counts.set(value, next);
    if (next > bestCount || (next === bestCount && value < bestValue)) {
      bestCount = next;
      bestValue = value;
    }
  }
  return bestValue;
}`,
    difficulty: 'easy',
    tags: ['arrays', 'hash-map'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ values: [4, 2, 4, 3, 2, 4] }, 4),
      tc({ values: [9, 9, 1, 1] }, 1),
      tc({ values: [5] }, 5),
      tc({ values: [-1, -1, -2, -2, -2] }, -2, { hidden: true }),
      tc({ values: [7, 8, 8, 7, 6, 6] }, 6, { hidden: true }),
    ],
  }),
  problem({
    title: 'Raman\'s Digit Echo',
    scientist: 'C. V. Raman',
    shortStory: 'a sensor compresses a large number by repeatedly summing its digits until only one digit remains.',
    problemStatement: 'Given a non-negative integer `n`, repeatedly replace it with the sum of its digits until the result has only one digit. Return that final digit.',
    inputFormat: 'An object with `n` (non-negative integer).',
    outputFormat: 'Return one integer.',
    constraintsText: '0 <= n <= 10^12.',
    solutionExplanation: 'Loop while the number has at least two digits, summing digits each round.',
    referenceSolutionJavascript: `
function solution(input) {
  let n = input.n;
  while (n >= 10) {
    let sum = 0;
    while (n > 0) {
      sum += n % 10;
      n = Math.floor(n / 10);
    }
    n = sum;
  }
  return n;
}`,
    difficulty: 'easy',
    tags: ['math', 'number-theory'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ n: 0 }, 0),
      tc({ n: 38 }, 2),
      tc({ n: 9999 }, 9),
      tc({ n: 1729 }, 1, { hidden: true }),
      tc({ n: 500000000000 }, 5, { hidden: true }),
    ],
  }),
  problem({
    title: 'Galileo\'s Rising Streak',
    scientist: 'Galileo Galilei',
    shortStory: 'the observatory wants the longest consecutive run where each reading is strictly larger than the previous one.',
    problemStatement: 'Given an array of integers, return the length of the longest contiguous strictly increasing segment.',
    inputFormat: 'An object with `values` (integer array).',
    outputFormat: 'Return one integer.',
    constraintsText: '1 <= values.length <= 200000.',
    solutionExplanation: 'Track the current streak length and the best streak length while scanning the array once.',
    referenceSolutionJavascript: `
function solution(input) {
  const values = input.values;
  let best = 1;
  let current = 1;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) current++;
    else current = 1;
    if (current > best) best = current;
  }
  return best;
}`,
    difficulty: 'easy',
    tags: ['arrays', 'greedy'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ values: [1, 2, 3, 2, 4] }, 3),
      tc({ values: [5, 4, 3] }, 1),
      tc({ values: [2, 3, 4, 5, 6] }, 5),
      tc({ values: [1, 1, 2, 3] }, 3, { hidden: true }),
      tc({ values: [9, 10, 7, 8, 9, 10] }, 4, { hidden: true }),
    ],
  }),
  problem({
    title: 'Meitner\'s Rotation Check',
    scientist: 'Lise Meitner',
    shortStory: 'a detector array is shifted to the right after each calibration and the final order must be reconstructed.',
    problemStatement: 'Given an array `nums` and a non-negative integer `k`, rotate the array to the right by `k` positions and return the resulting array.',
    inputFormat: 'An object with `nums` (integer array) and `k` (integer).',
    outputFormat: 'Return the rotated array.',
    constraintsText: '1 <= nums.length <= 200000; 0 <= k <= 10^18.',
    solutionExplanation: 'Use modulo to reduce `k`, then take the last `k` elements followed by the first `n-k` elements.',
    referenceSolutionJavascript: `
function solution(input) {
  const nums = input.nums;
  const n = nums.length;
  const k = input.k % n;
  if (k === 0) return nums.slice();
  return nums.slice(n - k).concat(nums.slice(0, n - k));
}`,
    difficulty: 'easy',
    tags: ['arrays'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ nums: [1, 2, 3, 4], k: 1 }, [4, 1, 2, 3]),
      tc({ nums: [1, 2, 3, 4], k: 4 }, [1, 2, 3, 4]),
      tc({ nums: [9, 8, 7], k: 5 }, [8, 7, 9]),
      tc({ nums: [5], k: 999 }, [5], { hidden: true }),
      tc({ nums: [3, 1, 4, 1, 5], k: 2 }, [1, 5, 3, 1, 4], { hidden: true }),
    ],
  }),
  problem({
    title: 'Pasteur\'s Shared Samples',
    scientist: 'Louis Pasteur',
    shortStory: 'two trays of cultures are compared and only the sample ids present in both trays should remain.',
    problemStatement: 'Given two arrays of integers, return the sorted array of distinct values that appear in both arrays.',
    inputFormat: 'An object with `a` and `b`, both integer arrays.',
    outputFormat: 'Return an integer array in increasing order.',
    constraintsText: '1 <= a.length, b.length <= 100000.',
    solutionExplanation: 'Insert one array into a set, collect matches from the second array into another set, then sort the result.',
    referenceSolutionJavascript: `
function solution(input) {
  const setA = new Set(input.a);
  const common = new Set();
  for (const value of input.b) {
    if (setA.has(value)) common.add(value);
  }
  return Array.from(common).sort((x, y) => x - y);
}`,
    difficulty: 'easy',
    tags: ['arrays', 'hash-set'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ a: [1, 2, 2, 4], b: [2, 2, 5] }, [2]),
      tc({ a: [7, 8], b: [9, 10] }, []),
      tc({ a: [-1, 0, 1], b: [1, 0, -1, -1] }, [-1, 0, 1]),
      tc({ a: [5, 5, 5], b: [5] }, [5], { hidden: true }),
      tc({ a: [3, 6, 9], b: [9, 6, 3] }, [3, 6, 9], { hidden: true }),
    ],
  }),
  problem({
    title: 'Herschel\'s Brightest Row',
    scientist: 'Caroline Herschel',
    shortStory: 'each row of a sensor matrix has a brightness score, and the brightest row index must be reported.',
    problemStatement: 'Given a matrix of integers, find the row with the largest row sum. If several rows tie, return the smallest row index.',
    inputFormat: 'An object with `grid`, a 2D integer array.',
    outputFormat: 'Return the row index as an integer.',
    constraintsText: '1 <= rows, cols <= 300.',
    solutionExplanation: 'Compute the sum of each row and keep the index of the best sum seen so far.',
    referenceSolutionJavascript: `
function solution(input) {
  const grid = input.grid;
  let bestIndex = 0;
  let bestSum = -Infinity;
  for (let r = 0; r < grid.length; r++) {
    let sum = 0;
    for (const value of grid[r]) sum += value;
    if (sum > bestSum) {
      bestSum = sum;
      bestIndex = r;
    }
  }
  return bestIndex;
}`,
    difficulty: 'easy',
    tags: ['arrays', 'matrix'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ grid: [[1, 2], [3, 0]] }, 0),
      tc({ grid: [[0], [5], [2]] }, 1),
      tc({ grid: [[-5, -1], [-2, -2]] }, 1),
      tc({ grid: [[4, 4], [3, 5], [2, 6]] }, 0, { hidden: true }),
      tc({ grid: [[10, 0, 0]] }, 0, { hidden: true }),
    ],
  }),
  problem({
    title: 'Feynman\'s Missing Badge',
    scientist: 'Richard Feynman',
    shortStory: 'one badge number from 1 through n vanished from a shuffled registration list.',
    problemStatement: 'You are given `n` and an array containing every integer from 1 to `n` except one. Return the missing value.',
    inputFormat: 'An object with `n` (integer) and `values` (integer array of length n-1).',
    outputFormat: 'Return the missing integer.',
    constraintsText: '1 <= n <= 200000.',
    solutionExplanation: 'Subtract the sum of the given array from the sum of 1..n.',
    referenceSolutionJavascript: `
function solution(input) {
  const { n, values } = input;
  const expected = (n * (n + 1)) / 2;
  let actual = 0;
  for (const value of values) actual += value;
  return expected - actual;
}`,
    difficulty: 'easy',
    tags: ['math', 'arrays'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ n: 5, values: [1, 2, 4, 5] }, 3),
      tc({ n: 1, values: [] }, 1),
      tc({ n: 4, values: [2, 3, 4] }, 1),
      tc({ n: 6, values: [1, 2, 3, 4, 5] }, 6, { hidden: true }),
      tc({ n: 7, values: [1, 2, 3, 5, 6, 7] }, 4, { hidden: true }),
    ],
  }),
  problem({
    title: 'Einstein\'s Letter Shuffle',
    scientist: 'Albert Einstein',
    shortStory: 'two labels refer to the same sample only if one can be rearranged into the other exactly.',
    problemStatement: 'Given strings `a` and `b`, determine whether they are anagrams of each other. Uppercase and lowercase letters are considered different.',
    inputFormat: 'An object with strings `a` and `b`.',
    outputFormat: 'Return `true` or `false`.',
    constraintsText: '0 <= a.length, b.length <= 200000.',
    solutionExplanation: 'If lengths differ, answer is false. Otherwise count characters from one string and cancel them with the other.',
    referenceSolutionJavascript: `
function solution(input) {
  const { a, b } = input;
  if (a.length !== b.length) return false;
  const counts = new Map();
  for (const ch of a) counts.set(ch, (counts.get(ch) || 0) + 1);
  for (const ch of b) {
    if (!counts.has(ch)) return false;
    const next = counts.get(ch) - 1;
    if (next === 0) counts.delete(ch);
    else counts.set(ch, next);
  }
  return counts.size === 0;
}`,
    difficulty: 'easy',
    tags: ['strings', 'hash-map'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ a: 'silent', b: 'listen' }, true),
      tc({ a: 'Lab', b: 'bal' }, false),
      tc({ a: '', b: '' }, true),
      tc({ a: 'triangle', b: 'integral' }, true, { hidden: true }),
      tc({ a: 'note', b: 'tonee' }, false, { hidden: true }),
    ],
  }),
  problem({
    title: 'Goodall\'s Quiet Window',
    scientist: 'Jane Goodall',
    shortStory: 'a field recorder marks a window as quiet only when the average noise stays at or below the threshold.',
    problemStatement: 'Given an array `noise`, an integer `k`, and an integer `limit`, count how many contiguous windows of length `k` have average value less than or equal to `limit`.',
    inputFormat: 'An object with `noise` (integer array), `k` (integer), and `limit` (integer).',
    outputFormat: 'Return one integer.',
    constraintsText: '1 <= k <= noise.length <= 200000.',
    solutionExplanation: 'Use a sliding window sum. A window is valid if `windowSum <= k * limit`.',
    referenceSolutionJavascript: `
function solution(input) {
  const { noise, k, limit } = input;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < noise.length; i++) {
    sum += noise[i];
    if (i >= k) sum -= noise[i - k];
    if (i >= k - 1 && sum <= k * limit) count++;
  }
  return count;
}`,
    difficulty: 'easy',
    tags: ['arrays', 'sliding-window'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ noise: [2, 4, 3, 1], k: 2, limit: 3 }, 2),
      tc({ noise: [5, 5, 5], k: 1, limit: 4 }, 0),
      tc({ noise: [1, 1, 1, 1], k: 3, limit: 1 }, 2),
      tc({ noise: [3, 6, 3, 6], k: 2, limit: 4 }, 0, { hidden: true }),
      tc({ noise: [7], k: 1, limit: 7 }, 1, { hidden: true }),
    ],
  }),
  problem({
    title: 'Faraday\'s Nearest Multiple',
    scientist: 'Michael Faraday',
    shortStory: 'a calibration wheel snaps to the closest multiple of a base step, and the travel distance must be reported.',
    problemStatement: 'Given integers `value` and `step`, return the smallest absolute distance from `value` to any multiple of `step`.',
    inputFormat: 'An object with `value` and `step`.',
    outputFormat: 'Return one integer.',
    constraintsText: '1 <= step <= 10^9; 0 <= value <= 10^18.',
    solutionExplanation: 'Compute `value % step`. The nearest multiple is either below by that remainder or above by `step - remainder`.',
    referenceSolutionJavascript: `
function solution(input) {
  const { value, step } = input;
  const rem = value % step;
  return Math.min(rem, (step - rem) % step);
}`,
    difficulty: 'easy',
    tags: ['math'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ value: 14, step: 5 }, 1),
      tc({ value: 20, step: 4 }, 0),
      tc({ value: 1, step: 7 }, 1),
      tc({ value: 29, step: 6 }, 1, { hidden: true }),
      tc({ value: 999999999999, step: 10 }, 1, { hidden: true }),
    ],
  }),
  problem({
    title: 'Sagan\'s Reversed Broadcast',
    scientist: 'Carl Sagan',
    shortStory: 'a transmission arrived with its words in reverse order, but each word itself stayed unchanged.',
    problemStatement: 'Given a sentence made of words separated by single spaces, return a new sentence with the word order reversed.',
    inputFormat: 'An object with `sentence` (string).',
    outputFormat: 'Return a string.',
    constraintsText: '1 <= sentence.length <= 200000; there are no leading or trailing spaces.',
    solutionExplanation: 'Split the sentence by spaces, reverse the list of words, then join with spaces.',
    referenceSolutionJavascript: `
function solution(input) {
  return input.sentence.split(' ').reverse().join(' ');
}`,
    difficulty: 'easy',
    tags: ['strings'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ sentence: 'red blue green' }, 'green blue red'),
      tc({ sentence: 'solo' }, 'solo'),
      tc({ sentence: 'stars align tonight' }, 'tonight align stars'),
      tc({ sentence: 'one two' }, 'two one', { hidden: true }),
      tc({ sentence: 'alpha beta gamma delta' }, 'delta gamma beta alpha', { hidden: true }),
    ],
  }),
  problem({
    title: 'Turing\'s Neighbor Map',
    scientist: 'Alan Turing',
    shortStory: 'a network diagram is considered fragile when many nodes have degree one.',
    problemStatement: 'Given an undirected graph with nodes labeled from 0 to n-1, count how many nodes have degree exactly one.',
    inputFormat: 'An object with `n` (integer) and `edges` (array of `[u, v]`).',
    outputFormat: 'Return one integer.',
    constraintsText: '1 <= n <= 200000; 0 <= edges.length <= 200000; no self-loops.',
    solutionExplanation: 'Compute the degree of each node from the edge list, then count how many degrees equal one.',
    referenceSolutionJavascript: `
function solution(input) {
  const deg = Array(input.n).fill(0);
  for (const [u, v] of input.edges) {
    deg[u]++;
    deg[v]++;
  }
  let count = 0;
  for (const d of deg) if (d === 1) count++;
  return count;
}`,
    difficulty: 'easy',
    tags: ['graphs'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ n: 4, edges: [[0, 1], [1, 2], [1, 3]] }, 3),
      tc({ n: 3, edges: [[0, 1], [1, 2], [2, 0]] }, 0),
      tc({ n: 5, edges: [] }, 0),
      tc({ n: 2, edges: [[0, 1]] }, 2, { hidden: true }),
      tc({ n: 6, edges: [[0, 1], [1, 2], [2, 3], [3, 4]] }, 2, { hidden: true }),
    ],
  }),
  problem({
    title: 'Berners-Lee\'s Safe Brackets',
    scientist: 'Tim Berners-Lee',
    shortStory: 'a markup fragment passes the pre-check only if every bracket closes correctly.',
    problemStatement: 'Given a string containing only `()[]{}`, determine whether it is balanced.',
    inputFormat: 'An object with `s` (string).',
    outputFormat: 'Return `true` or `false`.',
    constraintsText: '0 <= s.length <= 200000.',
    solutionExplanation: 'Use a stack of opening brackets. Each closing bracket must match the top of the stack.',
    referenceSolutionJavascript: `
function solution(input) {
  const map = new Map([[")", "("], ["]", "["], ["}", "{"]]);
  const stack = [];
  for (const ch of input.s) {
    if (map.has(ch)) {
      if (stack.pop() !== map.get(ch)) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}`,
    difficulty: 'easy',
    tags: ['strings', 'stack'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ s: '()[]{}' }, true),
      tc({ s: '([)]' }, false),
      tc({ s: '' }, true),
      tc({ s: '{[()]}' }, true, { hidden: true }),
      tc({ s: '((' }, false, { hidden: true }),
    ],
  }),
  problem({
    title: 'Newton\'s Coin Drawer',
    scientist: 'Isaac Newton',
    shortStory: 'the drawer contains coins of values 25, 10, 5, and 1, and the cashier always wants the minimum number of coins.',
    problemStatement: 'Given a non-negative integer amount, return the minimum number of coins needed using denominations 25, 10, 5, and 1.',
    inputFormat: 'An object with `amount` (integer).',
    outputFormat: 'Return one integer.',
    constraintsText: '0 <= amount <= 10^9.',
    solutionExplanation: 'For canonical U.S.-style coin values, greedily take the largest denomination each time.',
    referenceSolutionJavascript: `
function solution(input) {
  let amount = input.amount;
  let count = 0;
  for (const coin of [25, 10, 5, 1]) {
    count += Math.floor(amount / coin);
    amount %= coin;
  }
  return count;
}`,
    difficulty: 'easy',
    tags: ['greedy', 'math'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ amount: 41 }, 4),
      tc({ amount: 0 }, 0),
      tc({ amount: 99 }, 9),
      tc({ amount: 30 }, 2, { hidden: true }),
      tc({ amount: 7 }, 3, { hidden: true }),
    ],
  }),
  problem({
    title: 'Carson\'s Trail Steps',
    scientist: 'Rachel Carson',
    shortStory: 'a ranger logs every step from 1 to n, and the total number of logged steps must be computed recursively.',
    problemStatement: 'Given a positive integer `n`, return the sum `1 + 2 + ... + n` using a recursive idea.',
    inputFormat: 'An object with `n` (integer).',
    outputFormat: 'Return one integer.',
    constraintsText: '1 <= n <= 10000.',
    solutionExplanation: 'Use the recurrence `sum(n) = n + sum(n-1)` with base case `sum(1)=1`. The direct formula also works, but this problem highlights simple recursion.',
    referenceSolutionJavascript: `
function solution(input) {
  function go(n) {
    if (n <= 1) return n;
    return n + go(n - 1);
  }
  return go(input.n);
}`,
    difficulty: 'easy',
    tags: ['recursion', 'math'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ n: 1 }, 1),
      tc({ n: 4 }, 10),
      tc({ n: 10 }, 55),
      tc({ n: 7 }, 28, { hidden: true }),
      tc({ n: 100 }, 5050, { hidden: true }),
    ],
  }),
  problem({
    title: 'Bohr\'s Shared Prefix',
    scientist: 'Niels Bohr',
    shortStory: 'several encoded labels belong to the same batch only up to their longest shared starting segment.',
    problemStatement: 'Given an array of strings, return their longest common prefix. If no common prefix exists, return the empty string.',
    inputFormat: 'An object with `words` (string array).',
    outputFormat: 'Return a string.',
    constraintsText: '1 <= words.length <= 100000; total characters <= 200000.',
    solutionExplanation: 'Start with the first word as the candidate prefix and shorten it until every word starts with it.',
    referenceSolutionJavascript: `
function solution(input) {
  const words = input.words;
  let prefix = words[0] || '';
  for (let i = 1; i < words.length; i++) {
    while (!words[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === '') return '';
    }
  }
  return prefix;
}`,
    difficulty: 'easy',
    tags: ['strings'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ words: ['flower', 'flow', 'flight'] }, 'fl'),
      tc({ words: ['dog', 'racecar', 'car'] }, ''),
      tc({ words: ['solo'] }, 'solo'),
      tc({ words: ['interview', 'internal', 'internet'] }, 'inter', { hidden: true }),
      tc({ words: ['aa', 'aa', 'aa'] }, 'aa', { hidden: true }),
    ],
  }),
  problem({
    title: 'Mendel\'s Trait Counter',
    scientist: 'Gregor Mendel',
    shortStory: 'after cataloging sample traits, the lab wants quick frequency answers for many requested values.',
    problemStatement: 'Given an integer array `values` and an array `queries`, return an array where each position is the number of times the corresponding query appears in `values`.',
    inputFormat: 'An object with `values` (integer array) and `queries` (integer array).',
    outputFormat: 'Return an integer array.',
    constraintsText: '1 <= values.length, queries.length <= 100000.',
    solutionExplanation: 'Precompute a frequency map for `values`, then answer each query in constant average time.',
    referenceSolutionJavascript: `
function solution(input) {
  const freq = new Map();
  for (const value of input.values) freq.set(value, (freq.get(value) || 0) + 1);
  return input.queries.map((q) => freq.get(q) || 0);
}`,
    difficulty: 'easy',
    tags: ['arrays', 'hash-map'],
    estimatedTimeMinutes: 5,
    ratingWeight: 1,
    timeLimitSeconds: 300,
    testCases: [
      tc({ values: [1, 2, 2, 3], queries: [2, 4, 1] }, [2, 0, 1]),
      tc({ values: [5, 5, 5], queries: [5] }, [3]),
      tc({ values: [7, 8], queries: [8, 7, 8] }, [1, 1, 1]),
      tc({ values: [], queries: [1, 2] }, [0, 0], { hidden: true }),
      tc({ values: [-1, -1, 0], queries: [-1, 0, 1] }, [2, 1, 0], { hidden: true }),
    ],
  }),
];
