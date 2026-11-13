import type { Question, Topic } from '../types'
import { TOPICS } from '../types'

// Every JSON file in src/content/questions is picked up automatically.
// To add questions later: drop a new .json file in that folder, or add to an
// existing one. No code change is needed.
const modules = import.meta.glob<Question[]>('../content/questions/*.json', {
  eager: true,
  import: 'default',
})

export const ALL_QUESTIONS: Question[] = Object.keys(modules)
  .sort()
  .flatMap((path) => modules[path] ?? [])

export const QUESTION_BY_ID = new Map<string, Question>(ALL_QUESTIONS.map((q) => [q.id, q]))

const byTopic = new Map<Topic, Question[]>()
for (const topic of TOPICS) byTopic.set(topic, [])
for (const q of ALL_QUESTIONS) byTopic.get(q.topic)?.push(q)

export function questionsForTopic(topic: Topic): Question[] {
  return byTopic.get(topic) ?? []
}

export function topicCount(topic: Topic): number {
  return byTopic.get(topic)?.length ?? 0
}

/** Topics that actually have questions, so empty ones are not offered. */
export function availableTopics(): Topic[] {
  return TOPICS.filter((t) => topicCount(t) > 0)
}

export function lookup(ids: readonly string[]): Question[] {
  const out: Question[] = []
  for (const id of ids) {
    const q = QUESTION_BY_ID.get(id)
    if (q) out.push(q)
  }
  return out
}

/**
 * Same length as `ids`, with a hole where a question has gone.
 * A saved session stores ids, so a question removed in a later version must
 * not shift the answers that come after it.
 */
export function lookupMaybe(ids: readonly string[]): (Question | undefined)[] {
  return ids.map((id) => QUESTION_BY_ID.get(id))
}
