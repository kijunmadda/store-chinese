import BackHeader from '../components/BackHeader'

export default function Placeholder({ title, step }: { title: string; step: number }) {
  return (
    <>
      <BackHeader title={title} />
      <div className="card empty">
        <p>준비 중입니다.</p>
        <small>개발 {step}단계에서 구현됩니다.</small>
      </div>
    </>
  )
}
