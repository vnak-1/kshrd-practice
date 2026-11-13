import type { Section, Topic } from '../types'

export interface TopicMeta {
  label: string
  section: Section
  /** One short line, shown under the topic name. */
  blurb: string
}

export const TOPIC_META: Record<Topic, TopicMeta> = {
  logic: { label: 'Logic', section: 'aptitude', blurb: 'Series, relations, directions, seating' },
  numerical: { label: 'Numbers', section: 'aptitude', blurb: 'Percent, ratio, speed, work, profit' },
  analytical: { label: 'Analytical', section: 'aptitude', blurb: 'Reading tables, puzzles' },
  java: { label: 'Java', section: 'technical', blurb: 'Syntax, output, OOP, collections' },
  html: { label: 'HTML', section: 'technical', blurb: 'Tags, attributes, forms' },
  css: { label: 'CSS', section: 'technical', blurb: 'Selectors, box model, flexbox' },
  javascript: {
    label: 'JavaScript',
    section: 'technical',
    blurb: 'Event loop, promises, async, arrays',
  },
  react: { label: 'React', section: 'technical', blurb: 'JSX rules, hooks, props, keys' },
  nextjs: { label: 'Next.js', section: 'technical', blurb: 'SSR, SSG, ISR, routing' },
  sql: { label: 'SQL', section: 'technical', blurb: 'Clause order, joins, grouping' },
  networking: { label: 'Networking', section: 'technical', blurb: 'OSI, IP, ports, DNS, HTTP' },
  ai: { label: 'AI Basics', section: 'technical', blurb: 'LLMs, local models, RAG, tokens' },
  grammar: { label: 'Grammar', section: 'english', blurb: 'Usage and sentence choice' },
}

export const SECTION_LABEL: Record<Section, string> = {
  aptitude: 'Aptitude',
  technical: 'Technical',
  english: 'English',
}

export function topicsInSection(section: Section): Topic[] {
  return (Object.keys(TOPIC_META) as Topic[]).filter((t) => TOPIC_META[t].section === section)
}
