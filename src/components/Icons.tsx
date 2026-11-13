// Simple line icons. Emoji are avoided: they look different on every phone
// and screen readers read them out in odd ways.

interface IconProps {
  className?: string
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
}

export function HomeIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  )
}

export function PracticeIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M4 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" />
      <path d="M20 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" />
    </svg>
  )
}

export function MistakesIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3 2.5 20h19z" />
      <path d="M12 9v5" />
      <path d="M12 17.2h.01" />
    </svg>
  )
}

export function MoreIcon(p: IconProps) {
  return (
    <svg {...base} {...p}>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </svg>
  )
}

export function ChevronRight(p: IconProps) {
  return (
    <svg {...base} {...p} width="18" height="18">
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function FlagIcon({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base} {...p} fill={filled ? 'currentColor' : 'none'} width="20" height="20">
      <path d="M5 21V4h9l-1 3h6l-2 4 2 4h-8l-1-3H5" />
    </svg>
  )
}

export function ClockIcon(p: IconProps) {
  return (
    <svg {...base} {...p} width="16" height="16">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </svg>
  )
}

export function BackIcon(p: IconProps) {
  return (
    <svg {...base} {...p} width="22" height="22">
      <path d="M15 5 8 12l7 7" />
    </svg>
  )
}
