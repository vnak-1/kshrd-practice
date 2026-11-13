// Prints how many questions exist per topic, ready to paste into the
// "Current counts" table in PLAN.md.
// Run: npm run count

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const QUESTION_DIR = join(ROOT, 'src/content/questions')

let files = []
try {
  files = readdirSync(QUESTION_DIR).filter((f) => f.endsWith('.json')).sort()
} catch {
  console.log('No question folder yet.')
  process.exit(0)
}

const byTopic = new Map()
const byKind = new Map()
const byDifficulty = new Map()
let total = 0

for (const file of files) {
  const data = JSON.parse(readFileSync(join(QUESTION_DIR, file), 'utf8'))
  for (const q of data) {
    total += 1
    byTopic.set(q.topic, (byTopic.get(q.topic) ?? 0) + 1)
    byKind.set(q.kind, (byKind.get(q.kind) ?? 0) + 1)
    byDifficulty.set(q.difficulty, (byDifficulty.get(q.difficulty) ?? 0) + 1)
  }
}

const sorted = [...byTopic.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

console.log('| Topic | Written |')
console.log('|---|---|')
for (const [topic, n] of sorted) console.log(`| ${topic} | ${n} |`)
console.log(`| **total** | **${total}** |`)

const share = (n) => (total ? `${Math.round((n / total) * 100)}%` : '0%')
console.log('')
console.log(
  'kind: ' +
    ['concept', 'syntax', 'output']
      .map((k) => `${k} ${byKind.get(k) ?? 0} (${share(byKind.get(k) ?? 0)})`)
      .join(', '),
)
console.log(
  'difficulty: ' +
    [1, 2, 3]
      .map((d) => `${d} → ${byDifficulty.get(d) ?? 0} (${share(byDifficulty.get(d) ?? 0)})`)
      .join(', ') +
    '   [plan wants 30% / 50% / 20%]',
)
