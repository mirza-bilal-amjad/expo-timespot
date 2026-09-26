import { Translations } from "./en"

const ja: Translations = {
  common: {
    ok: "OK",
    cancel: "キャンセル",
    back: "戻る",
  },
  welcomeScreen: {
    postscript:
      "注目！ — このアプリはお好みの見た目では無いかもしれません(デザイナーがこのスクリーンを送ってこない限りは。もしそうなら公開しちゃいましょう！)",
    readyForLaunch: "このアプリはもう少しで公開できます！",
    exciting: "(楽しみですね！)",
  },
  errorScreen: {
    title: "問題が発生しました",
    friendlySubtitle:
      "本番では、エラーが投げられた時にこのページが表示されます。もし使うならこのメッセージに変更を加えてください(`app/i18n/jp.ts`)レイアウトはこちらで変更できます(`app/screens/ErrorScreen`)。もしこのスクリーンを取り除きたい場合は、`app/app.tsx`にある<ErrorBoundary>コンポーネントをチェックしてください",
    reset: "リセット",
  },
  emptyStateComponent: {
    generic: {
      heading: "静かだ...悲しい。",
      content:
        "データが見つかりません。ボタンを押してアプリをリロード、またはリフレッシュしてください。",
      button: "もう一度やってみよう",
    },
  },
  list: {
    moreOptions: "{{name}} のその他のオプション",
    rename: "名前を変更",
    moveUp: "上へ移動",
    moveDown: "下へ移動",
    remove: "削除",
    renameTitle: "都市名を変更",
    renameCancel: "キャンセル",
    save: "保存",
    useOriginalName: "「{{name}}」を使う",
    title: "世界時計",
    emptyTitle: "まだ都市がありません",
    emptyBody: "都市を追加すると、自分の時間と並べて表示されます。",
    emptyCta: "最初の都市を追加",
    cityRemoved: "都市を削除しました",
    undo: "元に戻す",
  },
  tabBar: {
    list: "世界時計",
    clock: "時計",
    map: "地図",
  },
  search: {
    title: "都市を追加",
    placeholder: "都市を検索",
    close: "検索を閉じる",
    popular: "人気の都市",
    noResults: "「{{query}}」という都市は見つかりません。",
    offsetHint: "UTCオフセットで検索、例: +5:30",
    useOffsetMatch: "{{name}}を使用する（このオフセットに一致）",
    focusHint: "ダブルタップでフォーカス",
    addHint: "ダブルタップで追加",
    alreadyAdded: "（追加済み）",
  },
  clock: {
    noCity: "都市がまだ選択されていません。",
    openSettings: "設定を開く",
    formatToggle: "時刻表示形式",
  },
  settings: {
    title: "設定",
    close: "設定を閉じる",
    appearance: "外観",
    theme: "テーマ",
    themeSystem: "システム",
    themeLight: "ライト",
    themeDark: "ダーク",
    time: "時刻",
    use24Hour: "24時間表示",
    about: "このアプリについて",
    version: "バージョン",
    cityData: "都市データ",
    mapData: "地図データ",
    typeface: "書体",
    publicDomain: "パブリックドメイン",
    timeData: "タイムゾーンデータ",
    timeDataSystem: "システム",
    timeDataBuiltIn: "内蔵テーブル（2030年まで）",
  },
  notices: {
    citiesReset:
      "保存した都市を読み込めなかったため、新しいリストで始めました。以前のデータのコピーは保存されています。",
    prefsReset: "設定を読み込めなかったため、初期設定に戻しました。",
    storageReset:
      "保存データの一部を読み込めなかったため、最初からやり直しました。コピーは保存されています。",
    storageRepaired:
      "保存された項目の一部を読み込めなかったため削除しました。その他のデータは無事です。",
    timeEngineDegraded:
      "この端末のタイムゾーン対応が限られているため、TimeSpot 独自のタイムゾーン表を使用しています。時刻は2030年まで正確です。",
    dismiss: "OK",
    dismissLabel: "このメッセージを閉じる",
  },
  errors: {
    title: "問題が発生しました",
    body: "TimeSpot で自動的に回復できないエラーが発生しました。再試行すると通常は解決します。",
    dataset:
      "都市データを読み込めませんでした。再試行してください。繰り返し起きる場合は TimeSpot を再インストールしてください。",
    retry: "再試行",
    reset: "保存データをリセット",
    resetHint: "都市と設定を消去してから再試行します",
  },
  sun: {
    midnightSun: "白夜",
    polarNight: "極夜",
    sunRises: "{{date}}に日の出",
    dayLength: "日照 : {{duration}}",
  },
}

export default ja
