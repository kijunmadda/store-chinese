import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

export default function BackHeader({ title, right }: { title: string; right?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="screen-header with-back">
      <button type="button" className="back" onClick={() => navigate(-1)} aria-label="뒤로">‹</button>
      <h1>{title}</h1>
      {right && <div className="header-right">{right}</div>}
    </header>
  )
}
