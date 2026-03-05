console.log("START test-judge.mjs");

(async () => {
  try {
    const { JudgeService } = await import("../services/judge.js");
    console.log("Imported JudgeService");

    const judge = new JudgeService();
    console.log("Constructed JudgeService");

    const code = `
function solution(input) {
  const a = input.a || [];
  const b = input.b || [];
  let i = 0, j = 0;
  const res = [];
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) res.push(a[i++]);
    else res.push(b[j++]);
  }
  while (i < a.length) res.push(a[i++]);
  while (j < b.length) res.push(b[j++]);
  return res;
}
`;

    const testCases = [
      { input_json: { a: [1, 3, 5], b: [2, 4, 6] }, expected_json: [1, 2, 3, 4, 5, 6], hidden: false },
      // simulates DB bug: expected_json stored as STRING
      { input_json: { a: [1, 3, 5], b: [2, 4, 6] }, expected_json: "[1,2,3,4,5,6]", hidden: false },
    ];

    const out = await judge.executeCode(code, "javascript", testCases);
    console.log("RESULT:\n", JSON.stringify(out, null, 2));
  } catch (e) {
    console.error("SCRIPT ERROR:", e);
    process.exit(1);
  }
})();