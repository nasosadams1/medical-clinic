// services/harness.js

// Updated harnesses:
// - JS harness calls "solution"/"solve" with best-effort argument spreading so
//   both LeetCode-style signatures and legacy signatures work.
// - For object inputs and multi-arg functions, it first tries binding by param name
//   so JSON key order differences cannot break correct submissions.
// - JS harness redirects all console output to stderr so stdout remains JSON-only.
// - Python harness similarly prefers parameter-name binding via inspect.signature.

export function jsHarness({ entries = ["solution", "solve"], userFile = "user.js" }) {
  const entriesJson = JSON.stringify(entries);

  return `const fs = require('fs');
const vm = require('vm');

// Keep stdout JSON-only: redirect all console output to stderr
console.log = (...a) => process.stderr.write(a.join(' ') + '\\n');
console.info = (...a) => process.stderr.write(a.join(' ') + '\\n');
console.warn = (...a) => process.stderr.write(a.join(' ') + '\\n');
console.error = (...a) => process.stderr.write(a.join(' ') + '\\n');

const inputData = JSON.parse(fs.readFileSync(0, 'utf-8'));

function pickFnFromModule(mod) {
  if (!mod) return null;
  if (typeof mod === 'function') return mod;
  for (const name of ${entriesJson}) {
    if (typeof mod[name] === 'function') return mod[name];
  }
  if (typeof mod.default === 'function') return mod.default;
  return null;
}

function pickFnFromContext(context) {
  for (const name of ${entriesJson}) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) continue;
    try {
      const candidate = vm.runInContext(
        \`typeof \${name} === "function" ? \${name} : undefined\`,
        context,
        { timeout: 1000 }
      );
      if (typeof candidate === 'function') return candidate;
    } catch (e) {}
  }
  return null;
}

let fn = null;

// First try: CommonJS require
try {
  const mod = require('./${userFile}');
  fn = pickFnFromModule(mod);
} catch (e) {}

// Fallback: VM context execution
if (!fn) {
  const code = fs.readFileSync('./${userFile}', 'utf-8');
  const context = { console, module: { exports: {} }, exports: {} };
  vm.createContext(context);

  try {
    vm.runInContext(code, context, { timeout: 1000 });
  } catch (e) {
    process.exit(1);
  }

  fn = pickFnFromModule(context.module.exports) || pickFnFromModule(context.exports);

  if (!fn) {
    for (const name of ${entriesJson}) {
      if (typeof context[name] === 'function') { fn = context[name]; break; }
    }
  }

  if (!fn) {
    fn = pickFnFromContext(context);
  }
}

if (!fn) {
  console.error('No entry function found.');
  process.exit(1);
}

function getParamNames(f) {
  try {
    const src = String(f)
      .replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')
      .replace(/\\/\\/.*$/gm, '');

    const m =
      src.match(/^[\\s\\(]*async\\s+function[^\\(]*\\(([^)]*)\\)/) ||
      src.match(/^[\\s\\(]*function[^\\(]*\\(([^)]*)\\)/) ||
      src.match(/^\\s*async\\s*\\(([^)]*)\\)\\s*=>/) ||
      src.match(/^\\s*\\(([^)]*)\\)\\s*=>/) ||
      src.match(/^\\s*async\\s+([^=()\\s,]+)\\s*=>/) ||
      src.match(/^\\s*([^=()\\s,]+)\\s*=>/);

    if (!m) return [];
    const raw = (m[1] ?? '').trim();
    if (!raw) return [];

    return raw
      .split(',')
      .map((s) =>
        s
          .trim()
          .replace(/^\\.\\.\\./, '')
          .split('=')[0]
          .trim()
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

function callWithBestEffort(fn, input) {
  if (Array.isArray(input)) {
    return fn.length === 1 ? fn(input) : fn(...input);
  }

  if (input !== null && typeof input === 'object') {
    const paramNames = getParamNames(fn);
    if (paramNames.length >= 1 && paramNames.every((k) => Object.prototype.hasOwnProperty.call(input, k))) {
      return fn(...paramNames.map((k) => input[k]));
    }

    const values = Object.values(input);

    // If function expects multiple args, spread the object values
    if (fn.length > 1) return fn(...values);

    // Otherwise pass the whole object (legacy/single-arg receiver)
    return fn(input);
  }

  return fn(input);
}

Promise.resolve()
  .then(() => callWithBestEffort(fn, inputData))
  .then((result) => {
    // JSON.stringify(undefined) returns undefined (not a string) -> must handle
    const out = JSON.stringify(result);
    process.stdout.write(out === undefined ? 'null' : out);
  })
  .catch(() => {
    process.exit(1);
  });
`;
}

export function pythonHarness({ entries = ["solution", "solve"], userFile = "user.py" }) {
  const entriesJson = JSON.stringify(entries);

  return `import sys, json, inspect, builtins, importlib

def _debug_print(*args, **kwargs):
    sep = kwargs.get("sep", " ")
    end = kwargs.get("end", "\\n")
    file = kwargs.get("file", sys.stderr)
    file.write(sep.join(str(arg) for arg in args) + end)

builtins.print = _debug_print

module = importlib.import_module("${userFile.replace(".py", "")}")

def _pick_fn(mod):
    for name in ${entriesJson}:
        candidate = getattr(mod, name, None)
        if callable(candidate):
            return candidate

    default = getattr(mod, "default", None)
    if callable(default):
        return default

    return None

fn = _pick_fn(module)
if fn is None:
    sys.exit(1)

def _call(fn, data):
    try:
        sig = inspect.signature(fn)
        params = [
            p for p in sig.parameters.values()
            if p.kind in (
                inspect.Parameter.POSITIONAL_ONLY,
                inspect.Parameter.POSITIONAL_OR_KEYWORD
            )
        ]
        arity = len(params)
    except Exception:
        return fn(data)

    if isinstance(data, dict):
        names = [p.name for p in params]
        if arity >= 1 and all(name in data for name in names):
            return fn(*[data[name] for name in names])

        vals = list(data.values())
        if arity > 1:
            return fn(*vals)
        return fn(data)

    if isinstance(data, list) and arity > 1:
        return fn(*data)

    return fn(data)

if __name__ == "__main__":
    try:
        data = json.loads(sys.stdin.read())
        sys.stdout.write(json.dumps(_call(fn, data)))
    except Exception:
        sys.exit(1)
`;
}
