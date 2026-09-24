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
}

export default ja
