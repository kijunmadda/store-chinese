import { Route, Routes } from 'react-router-dom'
import TabBar from './components/TabBar'
import Home from './screens/Home'
import StudyHub from './screens/StudyHub'
import Review from './screens/Review'
import Settings from './screens/Settings'
import Placeholder from './screens/Placeholder'
import { contentErrors } from './content'

export default function App() {
  return (
    <div className="app">
      <main className="screen">
        {contentErrors.length > 0 && (
          <div className="card warning" role="alert">
            일부 학습 콘텐츠에 오류가 있어 제외했습니다 ({contentErrors.length}건). 나머지는 정상적으로 학습할 수 있습니다.
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/today" element={<Placeholder title="오늘의 학습" step={9} />} />
          <Route path="/rescue" element={<Placeholder title="위기 탈출 카드" step={3} />} />
          <Route path="/study" element={<StudyHub />} />
          <Route path="/study/sentences" element={<Placeholder title="문장 학습" step={3} />} />
          <Route path="/study/listen" element={<Placeholder title="고객 질문 듣기" step={5} />} />
          <Route path="/study/speak" element={<Placeholder title="말하기 연습" step={6} />} />
          <Route path="/study/roleplay" element={<Placeholder title="상황별 역할극" step={7} />} />
          <Route path="/study/tones" element={<Placeholder title="발음·성조" step={10} />} />
          <Route path="/review" element={<Review />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}
