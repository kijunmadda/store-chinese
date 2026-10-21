import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { stopSpeech } from './speech'
import TabBar from './components/TabBar'
import Home from './screens/Home'
import StudyHub from './screens/StudyHub'
import Review from './screens/Review'
import Settings from './screens/Settings'
import Placeholder from './screens/Placeholder'
import SentenceCategories from './screens/SentenceCategories'
import SentenceStudy from './screens/SentenceStudy'
import Rescue from './screens/Rescue'
import ListenTraining from './screens/ListenTraining'
import { contentErrors } from './content'

export default function App() {
  const location = useLocation()
  // 화면을 옮기면 재생 중인 소리를 멈춘다
  useEffect(() => stopSpeech(), [location.pathname])

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
          <Route path="/rescue" element={<Rescue />} />
          <Route path="/study" element={<StudyHub />} />
          <Route path="/study/sentences" element={<SentenceCategories />} />
          <Route path="/study/sentences/:categoryId" element={<SentenceStudy />} />
          <Route path="/study/listen" element={<ListenTraining />} />
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
