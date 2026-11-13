// A `review` question has no code to run, so nothing proves its answer key.
// This script makes a second reader prove it instead.
//
// Step 1  node scripts/cold-read.mjs
//         Writes a sheet with the prompt and the options only. The right
//         answer, the `why` texts and the hint are all stripped out, so the
//         reader cannot see the key. Option order comes from the question id,
//         so the right answer is not always in the same place.
//
// Step 2  A reader who has not seen the key answers the sheet. Save their
//         picks as JSON: { "question-id": "B", ... }
//
// Step 3  node scripts/cold-read.mjs --answers <file>
//         Agreement stamps verify.reviewed = true. Disagreement is printed
//         and nothing is stamped, because one of the two reads is wrong.
//
// This is not proof the way running a program is proof. It only catches a
// key that a second reader cannot agree with.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const QUESTION_DIR = join(ROOT, 'src/content/questions')
const SHEET = join(ROOT, 'cold-read-sheet.json')
const LETTERS = ['A', 'B', 'C', 'D', 'E']

/** Same mulberry32 the app uses, so the order is stable and repeatable. */
function makeRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFromId(id) {
  let h = 2166136261
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Option indexes in a shuffled order that depends only on the id. */
function orderFor(id, count) {
  const random = makeRandom(seedFromId(id))
  const order = Array.from({ length: count }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const swap = order[i]
    order[i] = order[j]
    order[j] = swap
  }
  return order
}

function load() {
  const files = readdirSync(QUESTION_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
  const items = []
  for (const file of files) {
    const data = JSON.parse(readFileSync(join(QUESTION_DIR, file), 'utf8'))
    data.forEach((q, index) => {
      if (q && q.verify && q.verify.runner === 'review') items.push({ file, index, q })
    })
  }
  return { files, items }
}

const answerArg = process.argv.indexOf('--answers')

if (answerArg === -1) {
  const { items } = load()
  const todo = items.filter(({ q }) => q.verify.reviewed !== true)
  const sheet = todo.map(({ q }) => ({
    id: q.id,
    prompt: q.prompt,
    options: orderFor(q.id, q.options.length).map((i, slot) => ({
      letter: LETTERS[slot],
      text: q.options[i].text,
    })),
  }))
  writeFileSync(SHEET, `${JSON.stringify(sheet, null, 2)}\n`)
  console.log(
    `cold-read: ${items.length} review question(s), ${todo.length} still unstamped.\n` +
      `Sheet written to ${SHEET}\n` +
      'Give that file to a reader who has not seen the key. Save their picks as\n' +
      '{ "question-id": "B", ... } and run: node scripts/cold-read.mjs --answers <file>',
  )
  process.exit(0)
}

const answerFile = process.argv[answerArg + 1]
if (!answerFile) {
  console.error('cold-read: --answers needs a file path')
  process.exit(1)
}

const picks = JSON.parse(readFileSync(answerFile, 'utf8'))
const { items } = load()
const byFile = new Map()
const agreed = []
const disagreed = []
const missing = []

for (const { file, index, q } of items) {
  const pick = picks[q.id]
  if (typeof pick !== 'string') {
    if (q.verify.reviewed !== true) missing.push(q.id)
    continue
  }
  const order = orderFor(q.id, q.options.length)
  const slot = LETTERS.indexOf(pick.trim().toUpperCase())
  if (slot < 0 || slot >= order.length) {
    disagreed.push(`${q.id}: "${pick}" is not a letter on the sheet`)
    continue
  }
  const chosen = q.options[order[slot]]
  if (chosen.correct !== true) {
    const key = q.options.findIndex((o) => o.correct)
    disagreed.push(
      `${q.id}: the reader picked "${chosen.text}" but the key says "${q.options[key].text}"`,
    )
    continue
  }
  agreed.push(q.id)
  if (!byFile.has(file)) byFile.set(file, new Set())
  byFile.get(file).add(index)
}

for (const [file, indexes] of byFile) {
  const path = join(QUESTION_DIR, file)
  const data = JSON.parse(readFileSync(path, 'utf8'))
  for (const index of indexes) data[index].verify.reviewed = true
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

console.log(`cold-read: stamped ${agreed.length} question(s) as reviewed.`)
if (missing.length > 0) {
  console.log(`cold-read: no answer given for ${missing.length}: ${missing.join(', ')}`)
}
if (disagreed.length > 0) {
  console.error(`\ncold-read: ${disagreed.length} disagreement(s) — fix these by hand\n`)
  for (const d of disagreed) console.error(`  - ${d}`)
  process.exit(1)
}
