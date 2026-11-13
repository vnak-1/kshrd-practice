import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackIcon } from './Icons'

interface Props {
  title: string
  right?: ReactNode
  /** Where Back goes. Default: the page before this one. */
  backTo?: string
}

export function PageHeader({ title, right, backTo }: Props) {
  const navigate = useNavigate()
  return (
    <div className="pagehead">
      <button
        type="button"
        className="back"
        aria-label="Back"
        onClick={() => {
          if (backTo) navigate(backTo)
          else navigate(-1)
        }}
      >
        <BackIcon />
      </button>
      <h1>{title}</h1>
      {right ? <div className="right">{right}</div> : null}
    </div>
  )
}
