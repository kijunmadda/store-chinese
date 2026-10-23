// 병음 라이브러리(pinyin-pro)가 문맥을 몰라 틀리게 읽는 것으로 판정된 표현 (근거 포함)
// check-pinyin.ts(기계 검사)와 make-tokens.ts(단어 조각 만들기)가 함께 쓴다.
import { customPinyin } from 'pinyin-pro'

export function applyPinyinOverrides() {
  customPinyin({
    怎么背: 'zěn me bēi', // 背: 메다 = bēi (bèi는 '등')
    单肩背: 'dān jiān bēi',
    上班背: 'shàng bān bēi',
    背: 'bēi', // 단독 글자 背·数는 이 앱에서 동사로만 씀 — 명사 뜻(등·숫자)이 콘텐츠에 추가되면 이 두 줄을 지울 것
    数一下: 'shǔ yí xià', // 数: 세다(동사) = shǔ (shù는 '숫자')
    数: 'shǔ',
    类似: 'lèi sì', // 사전 표준음 lèisì
    哪儿: 'nǎr', // 儿화: 한 음절로 표기
    小一号: 'xiǎo yí hào', // '한 사이즈'(수량) → 一 변조. 라이브러리는 서수(1번)로 읽음
    大一号: 'dà yí hào',
    一号: 'yí hào',
    谁: 'shéi', // 现代汉语词典: shéi(구어 기본음), shuí는 또 다른 읽기
  })
}
