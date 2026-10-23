import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { stopSpeech } from './speech'
import TabBar from './components/TabBar'
import Home from './screens/Home'
import Lesson from './screens/Lesson'
import Collection from './screens/Collection'
import Settings from './screens/Settings'
import SentenceStudy from './screens/SentenceStudy'
import Rescue from './screens/Rescue'
import RoleplayList from './screens/RoleplayList'
import RoleplayPlayer from './screens/RoleplayPlayer'
import ToneTrainer from './screens/ToneTrainer'
import { contentErrors } from './content'

export default function App() {
  const location = useLocation()
  // 화면을 옮기면 재생 중인 소리를 멈춘다
  useEffect(() => stopSpeech(), [location.pathname])
  const inLesson = location.pathname === '/lesson'

  return (
    <div className={`app ${inLesson ? 'in-lesson' : ''}`}>
      <main className="screen">
        {contentErrors.length > 0 && (
          <div className="card warning" role="alert">
            일부 학습 콘텐츠에 오류가 있어 제외했습니다 ({contentErrors.length}건). 나머지는 정상적으로 학습할 수 있습니다.
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          {/* key: '한 판 더'를 누를 때마다 새 판으로 시작 */}
          <Route path="/lesson" element={<Lesson key={location.key} />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/rescue" element={<Rescue />} />
          <Route path="/study/sentences/:categoryId" element={<SentenceStudy />} />
          <Route path="/study/roleplay" element={<RoleplayList />} />
          <Route path="/study/roleplay/:id" element={<RoleplayPlayer />} />
          <Route path="/study/tones" element={<ToneTrainer />} />
          <Route path="/settings" element={<Settings />} />
          {/* 예전 주소(오늘의 학습·복습·학습 메뉴 등)는 홈으로 */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}
