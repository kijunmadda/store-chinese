import { Link } from 'react-router-dom'
import { daysSinceBackup } from '../backup'
import { contentStats } from '../content'
import { LANG_ID, LANGS, switchLang, type LangId } from '../langs'
import { isMobile, isStandalone } from '../install'
import { usePrefs } from '../prefs'
import { computeStats } from '../stats'
import { computeStreak, todayLessons } from '../streak'
import { today, useStudyState } from '../store'

/** 오늘 목표 진행 원 */
function GoalRing({ done, goal }: { done: number; goal: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  const ratio = Math.min(done / goal, 1)
  return (
    <svg className="goal-ring" viewBox="0 0 64 64" role="img" aria-label={`오늘 목표 ${goal}판 중 ${Math.min(done, goal)}판`}>
      <circle cx="32" cy="32" r={r} className="ring-bg" />
      <circle cx="32" cy="32" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - ratio)} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle">{Math.min(done, goal)}/{goal}</text>
    </svg>
  )
}

export default function Home() {
  const state = useStudyState()
  const { dailyGoal } = usePrefs()
  const todayKey = today()
  const stats = computeStats(state, todayKey)
  const streak = computeStreak(state.days, todayKey)
  const lessons = todayLessons(state.days, todayKey)
  const goalMet = lessons >= dailyGoal
  const since = daysSinceBackup(state.lastBackupAt)
  const needBackup = stats.learned > 0 && (since === null || since >= 7)

  return (
    <>
      <div className="segmented lang-switch" role="radiogroup" aria-label="학습 언어">
        {(Object.keys(LANGS) as LangId[]).map((id) => (
          <button key={id} type="button" role="radio" aria-checked={LANG_ID === id} aria-selected={LANG_ID === id} onClick={() => switchLang(id)}>
            {LANGS[id].name}
          </button>
        ))}
      </div>

      <section className="home-top">
        <div className={`streak ${streak.today ? 'lit' : ''}`}>
          <span className="flame" aria-hidden="true">🔥</span>
          <strong>{streak.count}</strong>
          <span>일 연속</span>
        </div>
        <GoalRing done={lessons} goal={dailyGoal} />
      </section>

      <p className="home-message">
        {goalMet
          ? '오늘 목표 달성! 더 하고 싶으면 한 판 더 👍'
          : streak.atRisk
            ? '오늘 한 판 하면 연속 기록이 이어져요!'
            : lessons > 0
              ? `좋아요! 오늘 ${dailyGoal - lessons}판 남았어요.`
              : '오늘도 3분만 해요.'}
      </p>

      {contentStats.items === 0 ? (
        <div className="card empty">
          <p>
            <strong>{LANGS[LANG_ID].name} 문장을 준비하고 있어요.</strong>
            <br />
            검증이 끝난 문장부터 여기에 나와요.{contentStats.pending > 0 && ` (검토 중 ${contentStats.pending}개)`}
          </p>
        </div>
      ) : (
        <Link to="/lesson" className="btn-primary start">
          {goalMet ? '한 판 더' : lessons > 0 ? '이어서 학습' : '오늘의 학습 시작'}
          <small>약 3분 · 문제 6개 · 복습과 새 표현이 섞여 나와요</small>
        </Link>
      )}

      <Link to="/rescue" className="card rescue">
        <strong>🆘 위기 탈출 카드</strong>
        <span>못 알아들었을 때 바로 꺼내 쓰는 문장</span>
      </Link>

      <Link to="/collection" className="card home-progress">
        <span>배운 표현</span>
        <strong>{stats.learned} / {stats.total}</strong>
        <div className="progress-track"><div className="progress-bar" style={{ width: `${stats.percent}%` }} /></div>
      </Link>

      {isMobile() && !isStandalone() && (
        <Link to="/settings" className="card backup-alert">
          <strong>📲 홈 화면에 추가해 주세요</strong>
          <span>앱처럼 바로 열리고, 인터넷 없이도 학습할 수 있어요. 방법은 설정에서 안내해요.</span>
        </Link>
      )}

      {needBackup && (
        <Link to="/settings" className="card backup-alert">
          <strong>💾 {since === null ? '아직 백업한 적이 없어요' : `마지막 백업 후 ${since}일 지났어요`}</strong>
          <span>휴대폰 브라우저 데이터가 지워지면 학습 기록이 사라져요. 설정에서 백업해 주세요.</span>
        </Link>
      )}
    </>
  )
}
