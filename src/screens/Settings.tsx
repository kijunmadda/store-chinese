const items = [
  { title: '음성 선택·테스트', step: 4 },
  { title: '재생 속도', step: 4 },
  { title: '병음 표시', step: 3 },
  { title: '하루 새 문장 수', step: 9 },
  { title: '백업 내보내기 / 가져오기', step: 11 },
  { title: '학습 기록 초기화', step: 8 },
]

export default function Settings() {
  return (
    <>
      <header className="screen-header">
        <h1>설정</h1>
      </header>
      <ul className="menu-list">
        {items.map((i) => (
          <li key={i.title} className="menu-item disabled">
            <span className="menu-text">
              <strong>{i.title}</strong>
              <small>{i.step}단계에서 구현 예정</small>
            </span>
          </li>
        ))}
      </ul>
      <p className="note">
        학습 기록은 이 기기의 브라우저에만 저장됩니다. 기기 변경이나 데이터 삭제에 대비해 정기적으로 백업해 주세요.
      </p>
    </>
  )
}
