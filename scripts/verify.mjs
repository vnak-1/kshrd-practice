// Runs the code in every question and checks that the "correct" option really
// is what the computer prints. A wrong answer key is the worst bug this app
// could have, so this gate is not optional.
//
// Run: npm run verify
// Needs: java + javac (JDK), node, python3, sqlite3.
//
// How a question proves itself (see src/types.ts):
//   runner java / node   -> verify.program is run; stdout must equal the
//                           correct option's `match` (or its `text`)
//   runner python        -> print(verify.check), or verify.program, must equal it
//   runner sqlite        -> verify.setup + verify.query rows must equal it
//   runner review        -> no code to run; verify.reviewed must be true
// verify.expect can be 'exception:ClassName' or 'compile_error:<javac message>'
// instead. No wrong option may match the real output either.

import { execFile } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const QUESTION_DIR = join(ROOT, 'src/content/questions')
const POOL = 4
const TIMEOUT_MS = 20_000

const failures = []
const counts = { java: 0, node: 0, sqlite: 0, python: 0, review: 0 }

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(
      cmd,
      args,
      { timeout: TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, ...opts },
      (error, stdout, stderr) => {
        resolve({
          ok: !error,
          code: error && typeof error.code === 'number' ? error.code : error ? 1 : 0,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
          missing: Boolean(error && error.code === 'ENOENT'),
          timedOut: Boolean(error && error.killed),
        })
      },
    )
  })
}

function tidy(text) {
  return String(text)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .trim()
}

const NUMBER = /^-?\d+(\.\d+)?$/

/**
 * Text match, after trimming.
 *
 * `numeric` compares numbers by value, so 660 and 660.0 are one answer. That
 * is right for an aptitude sum, where the reader works out a number and the
 * trailing zero is noise.
 *
 * It is WRONG for a program's output. `3` and `3.0` are the whole point of a
 * casting or division question: `double d = 7 / 2` prints `3.0`, and a key of
 * `3` must fail. So only the python runner gets the loose compare.
 */
function same(actual, expected, numeric = false) {
  const a = tidy(actual)
  const b = tidy(expected)
  if (a === b) return true
  if (numeric && NUMBER.test(a) && NUMBER.test(b)) {
    return Math.abs(Number(a) - Number(b)) < 1e-9
  }
  return false
}

/** Only an aptitude sum may match by value. A program is compared exactly. */
function numericOk(q) {
  return q.verify.runner === 'python'
}

function expectedText(q) {
  const correct = q.options.find((o) => o.correct)
  return correct ? (correct.match ?? correct.text) : ''
}

/**
 * PLAN.md: "The runner must also assert that no wrong option matches the real
 * output." Two options that both match would make the question unfair.
 */
function wrongOptionMatches(q, actual) {
  for (const o of q.options) {
    if (o.correct) continue
    if (same(actual, o.match ?? o.text, numericOk(q))) {
      return `wrong option "${o.text}" also matches the real output "${tidy(actual)}"`
    }
  }
  return null
}

/** The code on screen must be the code that was run. */
function codeMatchesProgram(q, program) {
  if (!q.code || !program) return null
  const flat = program.replace(/\s+/g, ' ')
  for (const raw of q.code.source.split('\n')) {
    const line = raw.trim()
    // Three kinds of line are not in the program on purpose: `____` is a blank
    // for the reader to fill, `...` is code left out, `//` is a note.
    if (
      line.length < 4 ||
      line.includes('...') ||
      line.includes(BLANK_ON_SCREEN) ||
      line.startsWith('//')
    ) {
      continue
    }
    if (!flat.includes(line.replace(/\s+/g, ' '))) {
      return `the code on screen has a line the verified program does not: ${line}`
    }
  }
  return null
}

/**
 * For an aptitude question the block on screen is a table or a puzzle, not a
 * program, so `codeMatchesProgram` cannot apply. The check instead is: every
 * number the reader can see must appear in the working that proves the answer.
 * That catches the worst drift of all — the table shows 12 and the sum used 13.
 *
 * So do not show a derived number (a total row) in the table. Either leave it
 * out, or make the working compute it from the same figures.
 */
function numbersMatchWorking(q, working) {
  if (!q.code || !working) return null
  const used = new Set(String(working).match(/\d+(?:\.\d+)?/g) ?? [])
  for (const n of String(q.code.source).match(/\d+(?:\.\d+)?/g) ?? []) {
    if (!used.has(n)) {
      return (
        `the block on screen shows the number ${n}, but the working that proves ` +
        'the answer never uses it. The reader and the checker must see the same figures.'
      )
    }
  }
  return null
}

const BLANK_ON_SCREEN = '____'
const BLANK_IN_PROGRAM = '{{BLANK}}'
const MAIN_MARKER = /^[ \t]*\/\/[ \t]*inside main:[ \t]*\n?/m
/** A block that is its own type, so it must stay outside class Main. */
const OWN_TYPE = /^(public\s+|final\s+|abstract\s+|sealed\s+|static\s+)*(class|interface|enum|record)\b/

function indentBy(text, pad) {
  return text
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n')
}

/**
 * Splits the part above `// inside main:` into whole blocks, at column 0.
 * A block that declares its own type stays at the top of the file; anything
 * else (a method, a field) is a member of Main and goes inside it. Without
 * this, `static int twice(int n) {...}` lands outside every class and javac
 * says "class, interface, enum, or record expected".
 */
function splitTopBlocks(top) {
  const types = []
  const members = []
  let block = []
  let depth = 0
  const close = () => {
    if (block.length === 0) return
    ;(OWN_TYPE.test(block[0].trim()) ? types : members).push(block.join('\n'))
    block = []
    depth = 0
  }
  for (const line of top.split('\n')) {
    if (block.length === 0 && line.trim() === '') continue
    block.push(line)
    depth += (line.match(/\{/g) ?? []).length
    depth -= (line.match(/\}/g) ?? []).length
    if (depth <= 0) close()
  }
  close()
  return { types, members }
}

/**
 * The program that really runs.
 *
 * A question may leave `verify.program` out. Then it is built from the code on
 * screen, so the two cannot drift apart. For Java, the part above
 * `// inside main:` is split into types and members (see above) and the rest
 * goes inside main.
 */
function programFor(q) {
  if (q.verify.program) return q.verify.program
  if (!q.code) return null
  let src = q.code.source
  // Fill-the-blank: the only difference from the screen is the gap itself.
  if (q.verify.output !== undefined) {
    src = src.split(BLANK_ON_SCREEN).join(BLANK_IN_PROGRAM)
  }
  if (q.verify.runner === 'node') return `${src}\n`

  const hit = MAIN_MARKER.exec(src)
  let types = []
  let members = []
  let body = src
  if (hit) {
    const split = splitTopBlocks(src.slice(0, hit.index))
    types = split.types
    members = split.members
    body = src.slice(hit.index + hit[0].length)
  }
  // An import must sit at the top of the file. One written in the question
  // would otherwise land inside Main (a member) and javac would reject it.
  // java.util.* is always added, so a question about ArrayList, HashMap or
  // HashSet needs no import line on screen at all.
  const imports = new Set(['import java.util.*;'])
  const keep = (list) =>
    list.filter((block) => {
      const first = block.trim()
      if (!/^import\s/.test(first)) return true
      for (const line of block.split('\n')) {
        if (line.trim()) imports.add(line.trim())
      }
      return false
    })
  types = keep(types)
  members = keep(members)

  const head = types.length ? `${types.join('\n')}\n` : ''
  const fields = members.length ? `${indentBy(members.join('\n'), '  ')}\n` : ''
  const inner = indentBy(body, '    ').replace(/\n+$/, '')
  return (
    `${[...imports].join('\n')}\n${head}public class Main {\n${fields}` +
    `  public static void main(String[] args) {\n${inner}\n  }\n}\n`
  )
}

/**
 * Reads the class Java actually threw out of its stack trace, e.g.
 *   Exception in thread "main" java.lang.NullPointerException: ...
 * A plain substring test is not enough: "PointerException" sits inside
 * "NullPointerException", and "Exception" sits in "Exception in thread".
 */
const THROWN = /^Exception in thread "[^"]*"\s+([\w.$]+)/m

function thrownClass(stderr) {
  const hit = THROWN.exec(stderr)
  return hit ? hit[1] : null
}

/**
 * Ties the answer key to the real result. Without this a question can say the
 * program throws X while the key quietly points at some other option.
 */
function keyNames(q, needle, what) {
  const correct = q.options.find((o) => o.correct)
  const key = String(correct?.match ?? correct?.text ?? '')
  if (!key.includes(needle)) {
    return (
      `${what}, but the correct option "${correct?.text}" never says "${needle}". ` +
      'Say it in the option text, or put it in the option\'s "match".'
    )
  }
  for (const o of q.options) {
    if (o.correct) continue
    if (String(o.match ?? o.text).includes(needle)) {
      return `the wrong option "${o.text}" also says "${needle}", so two options look right.`
    }
  }
  return null
}

async function checkJava(q, dir, program) {
  writeFileSync(join(dir, 'Main.java'), program)
  const build = await run('javac', ['-nowarn', 'Main.java'], { cwd: dir })
  if (build.missing) return 'javac was not found. Install a JDK.'

  const wantCompileError = String(q.verify.expect ?? '').startsWith('compile_error:')
  if (wantCompileError) {
    // Any typo makes javac fail, so the real javac message must be named.
    // That proves the question fails for the reason the question claims.
    const needle = q.verify.expect.slice('compile_error:'.length).trim()
    if (build.ok) return 'expected a compile error, but the code compiled'
    if (!build.stderr.includes(needle)) {
      return `expected javac to say "${needle}", but it said:\n${tidy(build.stderr).slice(0, 500)}`
    }
    return compileErrorKey(q, build.stderr)
  }
  if (!build.ok) return `javac failed:\n${tidy(build.stderr).slice(0, 500)}`

  const out = await run('java', ['-cp', '.', 'Main'], { cwd: dir })
  return checkRunResult(q, out)
}

/**
 * A compile error on its own proves nothing about which option is right.
 * Two shapes are allowed:
 *   "Does this compile?"       -> the correct option's match is "compile_error"
 *   "Which line is wrong?"     -> the correct option IS the line, and javac
 *                                 quotes that line back in its message
 */
function compileErrorKey(q, stderr) {
  const correct = q.options.find((o) => o.correct)
  const key = String(correct?.match ?? correct?.text ?? '')
  if (key === 'compile_error') return null
  if (!stderr.includes(key)) {
    return (
      `javac never quoted the correct option "${correct?.text}". ` +
      'For "which line is wrong?" make the option the offending line. ' +
      'For "does it compile?" set the correct option\'s "match" to "compile_error".'
    )
  }
  for (const o of q.options) {
    if (o.correct) continue
    const other = String(o.match ?? o.text)
    if (other.length >= 5 && other !== 'compile_error' && stderr.includes(other)) {
      return `javac also quoted the wrong option "${o.text}", so two options look right.`
    }
  }
  return null
}

/**
 * Fill-the-blank questions. Every option is dropped into the blank and run.
 * The right one must print the wanted output. Every wrong one must not.
 * This is what makes a "which line completes it?" question fair.
 */
async function checkJavaBlank(q, dir, program) {
  const want = String(q.verify.output ?? '')
  for (const o of q.options) {
    writeFileSync(join(dir, 'Main.java'), program.split(BLANK_IN_PROGRAM).join(o.match ?? o.text))
    const build = await run('javac', ['-nowarn', 'Main.java'], { cwd: dir })
    if (build.missing) return 'javac was not found. Install a JDK.'
    let got = null
    if (build.ok) {
      const out = await run('java', ['-cp', '.', 'Main'], { cwd: dir })
      if (out.ok) got = out.stdout
    }
    const fits = got !== null && same(got, want)
    if (o.correct && !fits) {
      const saw = got === null ? 'it does not compile, or it crashes' : `it prints "${tidy(got)}"`
      return `the correct option "${o.text}" does not print "${want}": ${saw}`
    }
    if (!o.correct && fits) {
      return `the wrong option "${o.text}" also prints "${want}", so two options are right.`
    }
  }
  return null
}

/**
 * Node programs run from a scratch folder INSIDE the project, not from the
 * system temp dir. Node resolves an import by walking up from the file, so a
 * program in /tmp can never find this project's node_modules. Running from
 * here lets an HTML or CSS question import jsdom and prove its answer against
 * a real DOM, instead of being taken on trust.
 */
const NODE_SCRATCH = join(ROOT, 'node_modules', '.cache', 'kshrd-verify')

async function checkNode(q, dir, program) {
  mkdirSync(NODE_SCRATCH, { recursive: true })
  const file = join(NODE_SCRATCH, `${q.id.replace(/[^a-z0-9-]/gi, '_')}.mjs`)
  writeFileSync(file, program)
  try {
    const out = await run(process.execPath, [file], { cwd: NODE_SCRATCH })
    return checkRunResult(q, out)
  } finally {
    rmSync(file, { force: true })
  }
}

function checkRunResult(q, out) {
  const expect = q.verify.expect
  if (typeof expect === 'string' && expect.startsWith('exception:')) {
    const name = expect.slice('exception:'.length)
    if (out.ok) return `expected ${name} to be thrown, but the program ended normally`
    const thrown = thrownClass(out.stderr)
    if (thrown === null) {
      return `could not read the thrown class from:\n${tidy(out.stderr).slice(0, 400)}`
    }
    // Exact, not a substring: NullPointerException is not PointerException,
    // and it is not Exception either.
    if (name !== thrown && name !== thrown.split('.').pop()) {
      return `expected ${name}, but Java threw ${thrown}`
    }
    return keyNames(q, name, `the program threw ${thrown}`)
  }
  if (out.timedOut) return 'the program did not finish in time'
  if (!out.ok) return `the program crashed:\n${tidy(out.stderr).slice(0, 400)}`
  return compare(q, out.stdout, 'the program printed')
}

/** One place for: output equals the key, and no other option equals it. */
function compare(q, actual, what) {
  const want = expectedText(q)
  if (!same(actual, want, numericOk(q))) {
    return `${what} "${tidy(actual)}" but the correct option says "${want}"`
  }
  return wrongOptionMatches(q, actual)
}

async function checkPython(q, dir) {
  let out
  if (q.verify.program) {
    // A full program can prove a puzzle has exactly one answer, which a
    // single expression cannot.
    const file = join(dir, 'main.py')
    writeFileSync(file, q.verify.program)
    out = await run('python3', ['-I', file], { cwd: dir })
  } else {
    out = await run('python3', ['-I', '-c', `print(${q.verify.check})`])
  }
  if (out.missing) return 'python3 was not found.'
  if (!out.ok) return `python3 failed:\n${tidy(out.stderr).slice(0, 400)}`
  return compare(q, out.stdout, 'python worked out')
}

async function checkSqlite(q) {
  const script = `${q.verify.setup ? `${q.verify.setup}\n` : ''}${q.verify.query}\n`
  const out = await run('sqlite3', ['-batch', ':memory:', script])
  if (out.missing) return 'sqlite3 was not found.'
  if (!out.ok) return `sqlite3 failed:\n${tidy(out.stderr).slice(0, 400)}`
  return compare(q, out.stdout, 'sqlite printed')
}

async function checkOne(q) {
  counts[q.verify.runner] += 1
  if (q.verify.runner === 'review') return null
  if (q.verify.runner === 'sqlite') {
    const working = `${q.verify.setup ?? ''}\n${q.verify.query ?? ''}`
    return numbersMatchWorking(q, working) ?? (await checkSqlite(q))
  }

  const program = programFor(q)
  // Debugging a generated program: SHOW_PROGRAM=<question id> npm run verify
  if (process.env.SHOW_PROGRAM === q.id) {
    console.log(`\n----- program for ${q.id} -----\n${program}-----\n`)
  }
  // The block on screen is the program itself for java and node. For python
  // (an aptitude table or puzzle) it is data, and a different check applies.
  const mismatch =
    q.verify.runner === 'python'
      ? numbersMatchWorking(q, q.verify.program ?? q.verify.check)
      : codeMatchesProgram(q, program)
  if (mismatch) return mismatch

  const dir = mkdtempSync(join(tmpdir(), 'kshrd-verify-'))
  try {
    if (q.verify.runner === 'java') {
      return program.includes(BLANK_IN_PROGRAM)
        ? await checkJavaBlank(q, dir, program)
        : await checkJava(q, dir, program)
    }
    if (q.verify.runner === 'python') return await checkPython(q, dir)
    return await checkNode(q, dir, program)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function loadQuestions() {
  let files = []
  try {
    files = readdirSync(QUESTION_DIR).filter((f) => f.endsWith('.json')).sort()
  } catch {
    return []
  }
  const out = []
  for (const file of files) {
    const data = JSON.parse(readFileSync(join(QUESTION_DIR, file), 'utf8'))
    for (const q of data) out.push({ file, q })
  }
  return out
}

const items = loadQuestions()
if (items.length === 0) {
  console.log('verify: no question files yet.')
  process.exit(0)
}

let cursor = 0
async function worker() {
  while (cursor < items.length) {
    const { file, q } = items[cursor++]
    let problem
    try {
      problem = await checkOne(q)
    } catch (err) {
      problem = `the check itself broke: ${err.message}`
    }
    if (problem) failures.push(`${file} ${q.id} [${q.verify.runner}]: ${problem}`)
  }
}

await Promise.all(Array.from({ length: POOL }, worker))

const ran = items.length - counts.review
console.log(
  `verify: ran ${ran} question(s) (java ${counts.java}, node ${counts.node}, ` +
    `sqlite ${counts.sqlite}, python ${counts.python}); ${counts.review} read by review only.`,
)

if (failures.length > 0) {
  console.error(`\nverify: ${failures.length} wrong answer key(s) or broken program(s)\n`)
  for (const f of failures) console.error(`  - ${f}\n`)
  process.exit(1)
}
