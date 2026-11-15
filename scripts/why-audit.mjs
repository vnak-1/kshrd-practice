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
const cover = {}
let reasons = 0
let questions = 0
const allTopics = new Set()

for (const file of readdirSync(QUESTION_DIR).sort()) {
  if (!file.endsWith('.json')) continue
  for (const q of JSON.parse(readFileSync(join(QUESTION_DIR, file), 'utf8'))) {
    allTopics.add(q.topic)
    if (only && q.topic !== only) continue
    questions++
    const c = (cover[q.topic] ??= { q: 0, why: 0, run: 0 })
    c.q++
    for (const o of q.options ?? []) {
      if (o.correct) continue
      reasons++
      c.why++
      if (PROMISES_A_VALUE.test(o.why ?? '')) {
        c.run++
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

// Coverage, printed per topic and totalled.
//
// This exists because of how the Nov 15 audit went wrong. An ad-hoc print loop
// named its topics by hand -- logic, numerical, analytical -- and grammar fell
// out of the list. 60 reasons were never read, and NOTHING SAID SO, because a
// loop does not report what it was not asked to cover. The risk was worst
// exactly where the check was weakest: grammar is review-only, so no runner
// touches it either.
//
// So this script enumerates topics from the filesystem, never from a list, and
// prints what it covered so an omission has to show itself.
console.log('\n topic        questions  reasons  to run')
for (const topic of Object.keys(cover).sort()) {
  const c = cover[topic]
  console.log(
    ' ' + topic.padEnd(13) + String(c.q).padStart(6) + String(c.why).padStart(9) + String(c.run).padStart(8),
  )
}
console.log(' ' + 'TOTAL'.padEnd(13) + String(questions).padStart(6) + String(reasons).padStart(9) + String(toRun.length).padStart(8))

const missing = [...allTopics].filter((t) => !(t in cover)).sort()
if (missing.length > 0) {
  console.log(`\nwhy-audit: PARTIAL VIEW. These topics are NOT shown: ${missing.join(', ')}`)
}

console.log(
  `\nwhy-audit: ${questions} question(s), ${reasons} wrong-option reason(s) across ` +
    `${Object.keys(cover).length} topic(s).\n` +
    `${toRun.length} of them promise a value. RUN each one. This script checked nothing.\n` +
    `Not covered by this script at all: the ${questions} reasons on the RIGHT answers.`,
)
