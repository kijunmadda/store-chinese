import { useNavigate } from 'react-router-dom'

export default function Placeholder({ title, step }: { title: string; step: number }) {
  const navigate = useNavigate()
  return (
    <>
      <header className="screen-header with-back">
        <button type="button" className="back" onClick={() => navigate(-1)} aria-label="뒤로">‹</button>
        <h1>{title}</h1>
      </header>
      <div className="card empty">
        <p>준비 중입니다.</p>
        <small>개발 {step}단계에서 구현됩니다.</small>
      </div>
    </>
  )
}
