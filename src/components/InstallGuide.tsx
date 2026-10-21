import { useEffect, useState } from 'react'
import { browserKind, isStandalone, promptInstall, useCanPromptInstall } from '../install'

export default function InstallGuide() {
  const canPrompt = useCanPromptInstall()
  const standalone = isStandalone()
  const kind = browserKind()
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  return (
    <section className="card settings-group" aria-labelledby="install-title">
      <h2 id="install-title">홈 화면 앱</h2>
      {standalone ? (
        <p className="feedback right">✓ 홈 화면 앱으로 실행 중이에요. 인터넷 없이도 학습할 수 있어요.</p>
      ) : (
        <>
          <p className="note">
            홈 화면에 추가하면 앱처럼 바로 열리고, 인터넷 없이도 학습할 수 있어요.
            {kind === 'ios-safari' && ' 특히 아이폰은 홈 화면 앱이어야 학습 기록이 자동으로 지워지지 않아요.'}
          </p>
          {canPrompt && (
            <button type="button" className="btn-secondary strong" onClick={() => promptInstall()}>
              📲 홈 화면에 설치
            </button>
          )}
          {kind === 'ios-safari' && (
            <ol className="steps">
              <li>사파리 아래쪽 <strong>공유 버튼</strong>(네모에 화살표 ↑)</li>
              <li><strong>홈 화면에 추가</strong> → 추가</li>
            </ol>
          )}
          {kind === 'samsung' && !canPrompt && (
            <ol className="steps">
              <li>주소창 오른쪽의 <strong>설치 아이콘(⬇)</strong>이 보이면 누르기</li>
              <li>없으면 아래쪽 <strong>메뉴(≡)</strong> → <strong>현재 페이지 추가</strong> → <strong>홈 화면</strong></li>
            </ol>
          )}
          {kind === 'android-chrome' && !canPrompt && (
            <ol className="steps">
              <li>오른쪽 위 <strong>메뉴(⋮)</strong> → <strong>홈 화면에 추가</strong> 또는 <strong>앱 설치</strong></li>
            </ol>
          )}
          <p className="caution">
            ⚠ 홈 화면 앱은 브라우저와 학습 기록을 따로 저장할 수 있어요. 브라우저에서 이미 공부했다면 <strong>먼저 아래에서 백업</strong>하고, 홈 화면 앱에서 불러오세요. 이후에는 홈 화면 앱으로만 학습하세요.
          </p>
        </>
      )}
      {persisted !== null && (
        <p className="note">
          저장소 보호: {persisted ? '켜짐 — 브라우저가 공간 정리 시에도 기록을 지우지 않아요.' : '꺼짐 — 백업을 꼭 해 두세요.'}
        </p>
      )}
    </section>
  )
}
