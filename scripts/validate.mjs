// Checks every question file against the rules in src/types.ts.
// Run: npm run validate
// It never touches the network and never runs the questions' code.
// `npm run verify` is the one that runs code.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const QUESTION_DIR = join(ROOT, 'src/content/questions')

const SECTIONS = ['aptitude', 'technical', 'english']
const KINDS = ['concept', 'syntax', 'output']
const RUNNERS = ['java', 'node', 'sqlite', 'python', 'review']

/** Characters that fit on one code line on a 375px phone. Measured, not guessed. */
const CODE_LINE_MAX = 34
/** Same, for an option shown in the code font. The A/B/C/D circle eats 38px. */
const CODE_OPTION_MAX = 29

// Private details must never reach a public repo.
//
// The patterns below are safe to publish: an email address and a bare 7-digit
// number (a phone number) give nothing away on their own.
//
// The owner's name, school and student number are NOT here. Writing them into
// this file would publish the very words this check exists to keep out. They
// live in scripts/private-words.local.json, which .gitignore keeps local.
const FORBIDDEN = [/\b\d{7}\b/, /[\w.+-]+@[\w-]+\.\w+/]

const WORD_FILE = join(ROOT, 'scripts/private-words.local.json')
let privateWords = []
try {
  const words = JSON.parse(readFileSync(WORD_FILE, 'utf8'))
  if (Array.isArray(words)) {
    privateWords = words.filter((w) => typeof w === 'string' && w.trim().length > 1)
  }
} catch {
  // Missing on a fresh clone and in CI. The patterns above still run.
  //
  // This file CANNOT exist in CI: it holds the owner's real name, school and
  // student number, and committing it would publish the very words it exists to
  // keep out. So in CI the name check genuinely cannot run, and this script used
  // to print "name checks skipped" and exit 0 — a green run that never checked
  // the most sensitive rule in the project. See IN_CI below.
}
/**
 * In CI the word list is absent by design, so the name check is skipped and the
 * run still passes on the generic patterns alone. On a DEVELOPER machine the
 * same absence means the protection is silently off, which is a different thing
 * and must fail. Set by GitHub Actions; `CI=1 npm run validate` reproduces it.
 */
const IN_CI = Boolean(process.env.CI || process.env.GITHUB_ACTIONS)
for (const word of privateWords) {
  FORBIDDEN.push(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
}

const problems = []
const seenIds = new Map()
let count = 0

function fail(where, message) {
  problems.push(`${where}: ${message}`)
}

/** Topic -> section, read from the real files so the two can never drift. */
function readTopics() {
  const typesSrc = readFileSync(join(ROOT, 'src/types.ts'), 'utf8')
  const topicBlock = /export const TOPICS = \[([^\]]*)\]/.exec(typesSrc)
  if (!topicBlock) throw new Error('Could not read TOPICS from src/types.ts')
  const topics = [...topicBlock[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1])

  const metaSrc = readFileSync(join(ROOT, 'src/lib/topics.ts'), 'utf8')
  const metaBlock = /TOPIC_META: Record<Topic, TopicMeta> = \{([\s\S]*?)\n\}/.exec(metaSrc)
  if (!metaBlock) throw new Error('Could not read TOPIC_META from src/lib/topics.ts')
  const sectionOf = new Map()
  for (const entry of metaBlock[1].matchAll(/(\w+):\s*\{([^}]*)\}/g)) {
    const section = /section:\s*'([a-z]+)'/.exec(entry[2])
    if (section) sectionOf.set(entry[1], section[1])
  }

  for (const topic of topics) {
    if (!sectionOf.has(topic)) throw new Error(`Topic "${topic}" has no entry in TOPIC_META`)
  }
  return sectionOf
}

const SECTION_OF_TOPIC = readTopics()

function checkText(where, field, value, { min = 1, max = 400 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min) {
    fail(where, `${field} is missing or too short`)
    return
  }
  if (value.length > max) fail(where, `${field} is longer than ${max} characters`)
  for (const pattern of FORBIDDEN) {
    if (pattern.test(value)) fail(where, `${field} looks like private data (${pattern})`)
  }
}

function checkQuestion(file, index, q) {
  const where = `${file}[${index}]${q && q.id ? ` ${q.id}` : ''}`
  if (!q || typeof q !== 'object' || Array.isArray(q)) {
    fail(where, 'is not an object')
    return
  }

  if (typeof q.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(q.id)) {
    fail(where, 'id must be lower case words joined by dashes')
  } else if (seenIds.has(q.id)) {
    fail(where, `id is already used in ${seenIds.get(q.id)}`)
  } else {
    seenIds.set(q.id, file)
  }

  if (!SECTIONS.includes(q.section)) fail(where, `section "${q.section}" is not known`)
  if (!SECTION_OF_TOPIC.has(q.topic)) {
    fail(where, `topic "${q.topic}" is not known`)
  } else if (SECTION_OF_TOPIC.get(q.topic) !== q.section) {
    fail(where, `topic "${q.topic}" belongs to section "${SECTION_OF_TOPIC.get(q.topic)}"`)
  }
  if (!KINDS.includes(q.kind)) fail(where, `kind "${q.kind}" is not known`)
  if (![1, 2, 3].includes(q.difficulty)) fail(where, 'difficulty must be 1, 2 or 3')

  checkText(where, 'subtopic', q.subtopic, { max: 60 })
  checkText(where, 'prompt', q.prompt, { min: 10, max: 300 })
  if (q.hint !== undefined) checkText(where, 'hint', q.hint, { max: 160 })

  if (q.code !== undefined) {
    if (!q.code || typeof q.code !== 'object') {
      fail(where, 'code must be an object')
    } else {
      checkText(where, 'code.lang', q.code.lang, { max: 20 })
      checkText(where, 'code.source', q.code.source, { min: 5, max: 1400 })
      // 34 monospace characters is what fits in the code box on a 375px
      // phone (measured: 13.5px font, 8.13px per character, 281px box).
      // The CSS wraps anything longer, but a wrapped line looks like a real
      // new line, which is a trap in a syntax question. So break lines here.
      const longest = String(q.code.source ?? '')
        .split('\n')
        .reduce((n, line) => Math.max(n, line.length), 0)
      if (longest > CODE_LINE_MAX) {
        fail(
          where,
          `code line of ${longest} characters is wider than ${CODE_LINE_MAX}. ` +
            'It will wrap on a phone and look like an extra line. Break it yourself.',
        )
      }
    }
  }

  checkOptions(where, q)
  checkVerify(where, q)
}

function checkOptions(where, q) {
  if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 5) {
    fail(where, 'needs 3 to 5 options')
    return
  }
  const correct = q.options.filter((o) => o && o.correct === true)
  if (correct.length !== 1) fail(where, `has ${correct.length} correct options, needs exactly 1`)

  const texts = new Set()
  q.options.forEach((o, i) => {
    const spot = `${where} option ${i + 1}`
    if (!o || typeof o !== 'object') {
      fail(spot, 'is not an object')
      return
    }
    if (typeof o.correct !== 'boolean') fail(spot, 'correct must be true or false')
    checkText(spot, 'text', o.text, { max: 120 })
    // A code answer that wraps looks like two lines of code. That is the same
    // trap CODE_LINE_MAX exists to stop, so the option box gets its own limit.
    if (q.codeOptions === true && String(o.text ?? '').length > CODE_OPTION_MAX) {
      fail(
        spot,
        `code option of ${o.text.length} characters is wider than ${CODE_OPTION_MAX}. ` +
          'It will wrap on a phone and look like two lines of code.',
      )
    }
    checkText(spot, 'why', o.why, { min: 15, max: 400 })
    if (o.correct !== true) checkWhyNamesAMistake(spot, o)
    if (o.match !== undefined) {
      checkText(spot, 'match', o.match, { max: 400 })
      checkTextAgreesWithMatch(spot, o)
    }
    const key = String(o.text ?? '').trim().toLowerCase()
    if (texts.has(key)) fail(spot, 'repeats the text of another option')
    texts.add(key)
    if (/\b(all|none) of the (above|these)\b/i.test(String(o.text ?? ''))) {
      fail(spot, '"all/none of the above" does not test anything')
    }
  })
}

/**
 * A wrong option has to teach something. "No step gives this" teaches nothing:
 * it tells the reader the answer is wrong, which they already know, and it
 * usually means the writer picked the number at random.
 *
 * Nothing can check that a reason is TRUE — only a human, or a script that
 * works the wrong method out. This catches the laziest shape, which is the one
 * that kept appearing. Every wrong option must name the mistake that produces
 * it: "divided by the new price", "counted each handshake twice".
 */
const LAZY_WHY = [
  /\bno (step|rule|method|working)\b[^.]{0,30}\b(gives?|makes?|leads?)\b/i,
  /\bnothing (here )?gives\b/i,
  /\bwhich cannot be right\b/i,
  /\bthis is (just )?wrong\b/i,
  /\b(add|check|count|read) (it |them )?again\b/i,
]

function checkWhyNamesAMistake(spot, o) {
  for (const pattern of LAZY_WHY) {
    if (pattern.test(String(o.why ?? ''))) {
      fail(
        spot,
        'the reason does not name a mistake, it only says the answer is wrong. ' +
          'Say which wrong method gives this option, e.g. "this divides by the new price".',
      )
      return
    }
  }
}

/**
 * The runner compares `match`, but the reader only ever sees `text`. If those
 * two disagree, the app shows one answer and marks another. So every part of
 * `match` must appear in `text`, in the same order. The words between them are
 * free, which lets "A\nD\nC\nB" read as "A D C B" and "two\nthree" read as
 * "two then three".
 */
function checkTextAgreesWithMatch(spot, o) {
  const text = String(o.text ?? '')
  const match = String(o.match ?? '')
  if (match === 'compile_error') return // a label, not something printed
  let from = 0
  for (const raw of match.split('\n')) {
    const part = raw.trim()
    if (!part) continue
    const at = findPart(text, part, from)
    if (at < 0) {
      fail(
        spot,
        `text "${text}" does not show "${part}" from match, or shows it out of order. ` +
          'The reader must be able to see the answer they are picking.',
      )
      return
    }
    from = at + part.length
  }
}

const NUMBER_ONLY = /^-?\d+(\.\d+)?$/
const DIGIT_ISH = /[\d.]/

/**
 * Finds `part` in `text`. For a number, a digit or a dot either side does not
 * count: "3" must not be found inside "3.5", and "15" must not be found
 * inside "150%". Those are exactly the pairs where the shown answer and the
 * checked answer quietly disagree.
 */
function findPart(text, part, from) {
  if (!NUMBER_ONLY.test(part)) return text.indexOf(part, from)
  let at = text.indexOf(part, from)
  while (at >= 0) {
    const before = at > 0 ? text[at - 1] : ''
    const after = text[at + part.length] ?? ''
    if (!DIGIT_ISH.test(before) && !DIGIT_ISH.test(after)) return at
    at = text.indexOf(part, at + 1)
  }
  return -1
}

function checkVerify(where, q) {
  const v = q.verify
  if (!v || typeof v !== 'object') {
    fail(where, 'verify is missing')
    return
  }
  if (!RUNNERS.includes(v.runner)) {
    fail(where, `verify.runner "${v.runner}" is not known`)
    return
  }
  if (v.expect !== undefined) {
    // compile_error must name the javac message, so the question fails for the
    // reason the question claims and not because of some other typo.
    const ok =
      v.expect === 'stdout' ||
      /^exception:[A-Za-z][\w.]*$/.test(v.expect) ||
      /^compile_error:.{4,}$/.test(v.expect)
    if (!ok) {
      fail(
        where,
        `verify.expect "${v.expect}" is not stdout, exception:X or compile_error:<javac message>`,
      )
    }
    if (v.expect === 'compile_error') {
      fail(where, 'verify.expect must name the javac message: "compile_error:<message>"')
    }
  }

  if (v.runner === 'java' || v.runner === 'node') {
    if (!q.code) fail(where, `runner "${v.runner}" needs a code block in the question`)
    if (v.program === undefined) {
      // Fine: verify builds the program from the code on screen, so the two
      // cannot drift. Java splits on a "// inside main:" line.
      if (!q.code) fail(where, 'with no verify.program there is nothing to run')
    } else {
      checkText(where, 'verify.program', v.program, { min: 10, max: 2000 })
    }
  }
  // Fill-the-blank: every option is dropped into the blank and run, so the
  // right one must print `output` and no wrong one may.
  if (v.output !== undefined) {
    if (v.runner !== 'java') fail(where, 'verify.output (fill the blank) needs the java runner')
    checkText(where, 'verify.output', v.output, { max: 300 })
    if (!q.code || !q.code.source.includes('____')) {
      fail(where, 'fill the blank needs a ____ in the code, so the reader can see the gap')
    }
    if (typeof v.program === 'string' && !v.program.includes('{{BLANK}}')) {
      fail(where, 'a hand-written program for a blank question must contain {{BLANK}}')
    }
  } else if (typeof v.program === 'string' && v.program.includes('{{BLANK}}')) {
    fail(where, '{{BLANK}} needs verify.output: what the right option must print')
  }
  if (v.runner === 'python') {
    // Either a one-line sum (check) or a whole program that prints the answer.
    if (v.program !== undefined) {
      checkText(where, 'verify.program', v.program, { min: 10, max: 2000 })
    } else {
      checkText(where, 'verify.check', v.check, { min: 1, max: 300 })
    }
  }
  if (v.runner === 'sqlite') {
    checkText(where, 'verify.query', v.query, { min: 5, max: 600 })
    if (v.setup !== undefined) checkText(where, 'verify.setup', v.setup, { max: 2000 })
  }
  if (v.runner === 'review' && v.reviewed !== true) {
    fail(where, 'runner "review" needs verify.reviewed: true after a second read')
  }
}

let files = []
try {
  files = readdirSync(QUESTION_DIR).filter((f) => f.endsWith('.json')).sort()
} catch {
  console.error(`No folder ${QUESTION_DIR}`)
  process.exit(1)
}

if (files.length === 0) {
  console.log('validate: no question files yet.')
  process.exit(0)
}

for (const file of files) {
  let data
  const raw = readFileSync(join(QUESTION_DIR, file), 'utf8')
  try {
    data = JSON.parse(raw)
  } catch (err) {
    fail(file, `is not valid JSON: ${err.message}`)
    continue
  }
  if (!Array.isArray(data)) {
    fail(file, 'must hold an array of questions')
    continue
  }
  data.forEach((q, i) => {
    count += 1
    checkQuestion(file, i, q)
  })
}

if (problems.length > 0) {
  console.error(`validate: ${problems.length} problem(s) in ${count} question(s)\n`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}

if (privateWords.length === 0 && !IN_CI) {
  console.error('validate: scripts/private-words.local.json is missing.')
  console.error('  Without it the name, school and student-number check DOES NOT RUN,')
  console.error('  and this script would otherwise pass without saying the protection is off.')
  console.error('  Create it as a JSON array of strings to keep out of the public repo,')
  console.error('  e.g. ["Family Name", "Given Name", "School Name", "2023123456"].')
  console.error('  It is gitignored on purpose: committing it would publish those words.')
  process.exit(1)
}

const guard = privateWords.length
  ? `${privateWords.length} private word(s) guarded`
  : 'NAME CHECK DID NOT RUN (no word list in CI) — only a local run covers names'
console.log(
  `validate: ${count} question(s) in ${files.length} file(s) are all well formed. ${guard}.`,
)
