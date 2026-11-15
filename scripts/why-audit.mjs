// Builds the worklist for auditing the REASONS attached to wrong options.
// Run: npm run why-audit
//
// THIS SCRIPT PROVES NOTHING. It only finds the claims a person has to run.
//
// WHY IT EXISTS
//
// validate.mjs checks that a reason EXISTS. verify.mjs checks that the RIGHT
// answer is right. Nothing checks that a WRONG option's reason is TRUE, and a
// confident false reason teaches the wrong thing more firmly than no reason at
// all. The app shows every wrong option with its reason after each check, so
// these sentences get read as carefully as the answer does.
//
// Two of nineteen such claims were false when wave 2 was audited by hand, and
// five more turned up across the whole bank on Nov 15 2026.
//
// WHY THERE IS NO PASS OR FAIL HERE
//
// A first version of this script tried two automatic checks: arithmetic inside
// a reason, and reasons that only describe what a reader expected. Both were
// tested by planting a fault, and both missed it.
//
//   - The real wave-2 bug read "that is 3 x 2, every pair". It states no total,
//     so there is no sum to check. The data was 3 x 3. Only running it finds that.
//   - No pattern can tell "a fact" from "not a fact". A regex for a factual
//     clause matched "that is what you expected", because of the word "is".
//
// A check that cannot fail is worse than no check, because the green line gets
// believed. So this script prints a worklist and makes no claim about it, and
// `npm run check` does not run it.
//
// HOW TO USE IT
//
//   1. npm run why-audit
//   2. For each claim, write the thing it describes as a real program, query or
//      calculation, and RUN it.
//   3. The claim passes only if the output matches the reason's words. Close
//      enough is a fail.
//   4. A failure is a question bug, not a wording bug. If no real wrong method
//      produces that option, replace the OPTION too: a distractor that comes
//      from nowhere teaches nothing.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const QUESTION_DIR = join(ROOT, 'src/content/questions')
const only = process.argv.find((a) => a.startsWith('--topic='))?.slice('--topic='.length)

/**
 * A reason that promises a produced value, so a person must run something.
 * Deliberately wide: a false positive costs one re-read, a false negative is a
 * false reason left in the app.
 */
const PROMISES_A_VALUE =
  /\b(gives?|returns?|prints?|evaluates? to|yields?|equals?|produces?|outputs?|would be|would give|would match|would do|comes? to|comes out|results? in|adds? up to|divides?|multiplies|counts?|sorts?|that is \d|totals?)\b/i

const toRun = []
let reasons = 0
let questions = 0

for (const file of readdirSync(QUESTION_DIR).sort()) {
  if (!file.endsWith('.json')) continue
  for (const q of JSON.parse(readFileSync(join(QUESTION_DIR, file), 'utf8'))) {
    if (only && q.topic !== only) continue
    questions++
    for (const o of q.options ?? []) {
      if (o.correct) continue
      reasons++
      if (PROMISES_A_VALUE.test(o.why ?? '')) {
        toRun.push({ topic: q.topic, id: q.id, opt: o.text, why: o.why })
      }
    }
  }
}

const byTopic = {}
for (const r of toRun) (byTopic[r.topic] ??= []).push(r)
for (const topic of Object.keys(byTopic).sort()) {
  console.log(`\n## ${topic} (${byTopic[topic].length})`)
  for (const r of byTopic[topic]) console.log(`  ${r.id} -> "${r.opt}"\n    ${r.why}`)
}

console.log(
  `\nwhy-audit: ${questions} question(s), ${reasons} wrong-option reason(s).\n` +
    `${toRun.length} of them promise a value. RUN each one. This script checked nothing.`,
)
