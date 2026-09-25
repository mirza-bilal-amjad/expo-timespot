import { Translations } from "./en"

const ko: Translations = {
  common: {
    ok: "확인!",
    cancel: "취소",
    back: "뒤로",
  },
  welcomeScreen: {
    postscript:
      "잠깐! — 지금 보시는 것은 아마도 당신의 앱의 모양새가 아닐겁니다. (디자이너분이 이렇게 건내주셨다면 모를까요. 만약에 그렇다면, 이대로 가져갑시다!) ",
    readyForLaunch: "출시 준비가 거의 끝난 나만의 앱!",
    exciting: "(오, 이거 신나는데요!)",
  },
  errorScreen: {
    title: "뭔가 잘못되었습니다!",
    friendlySubtitle:
      "이 화면은 오류가 발생할 때 프로덕션에서 사용자에게 표시됩니다. 이 메시지를 커스터마이징 할 수 있고(해당 파일은 `app/i18n/ko.ts` 에 있습니다) 레이아웃도 마찬가지로 수정할 수 있습니다(`app/screens/error`). 만약 이 오류화면을 완전히 없에버리고 싶다면 `app/app.tsx` 파일에서 <ErrorBoundary> 컴포넌트를 확인하기 바랍니다.",
    reset: "초기화",
  },
  emptyStateComponent: {
    generic: {
      heading: "너무 텅 비어서.. 너무 슬퍼요..",
      content: "데이터가 없습니다. 버튼을 눌러서 리프레쉬 하시거나 앱을 리로드하세요.",
      button: "다시 시도해봅시다",
    },
  },
  list: {
    title: "세계 시간",
    emptyTitle: "아직 도시가 없습니다",
    emptyBody: "도시를 추가하면 내 시간 옆에서 바로 볼 수 있어요.",
    emptyCta: "첫 도시 추가하기",
    cityRemoved: "도시가 삭제되었습니다",
    undo: "실행 취소",
  },
  tabBar: {
    list: "세계 시간",
    clock: "시계",
    map: "지도",
  },
  search: {
    title: "도시 추가",
    placeholder: "도시 검색",
    close: "검색 닫기",
    popular: "인기 도시",
    noResults: "'{{query}}'라는 도시를 찾을 수 없습니다.",
    offsetHint: "UTC 오프셋으로 검색해보세요, 예: +5:30",
    useOffsetMatch: "{{name}} 사용 (해당 오프셋과 일치)",
    focusHint: "두 번 탭하여 포커스",
    addHint: "두 번 탭하여 추가",
    alreadyAdded: ", 이미 추가됨",
  },
  clock: {
    noCity: "아직 선택된 도시가 없습니다.",
    openSettings: "설정 열기",
    formatToggle: "시간 형식",
  },
  settings: {
    title: "설정",
    close: "설정 닫기",
    appearance: "모양",
    theme: "테마",
    themeSystem: "시스템",
    themeLight: "라이트",
    themeDark: "다크",
    time: "시간",
    use24Hour: "24시간 형식",
    about: "정보",
    version: "버전",
    cityData: "도시 데이터",
    mapData: "지도 데이터",
    typeface: "서체",
    publicDomain: "퍼블릭 도메인",
  },
  sun: {
    midnightSun: "백야",
    polarNight: "극야",
    sunRises: "{{date}}에 해가 뜹니다",
    dayLength: "일조 : {{duration}}",
  },
}

export default ko
