import { Translations } from "./en"

const ar: Translations = {
  common: {
    ok: "نعم",
    cancel: "حذف",
    back: "خلف",
  },
  welcomeScreen: {
    postscript:
      "ربما لا يكون هذا هو الشكل الذي يبدو عليه تطبيقك مالم يمنحك المصمم هذه الشاشات وشحنها في هذه الحالة",
    readyForLaunch: "تطبيقك تقريبا جاهز للتشغيل",
    exciting: "اوه هذا مثير",
  },
  errorScreen: {
    title: "هناك خطأ ما",
    friendlySubtitle:
      "هذه هي الشاشة التي سيشاهدها المستخدمون في عملية الانتاج عند حدوث خطأ. سترغب في تخصيص هذه الرسالة ( الموجودة في 'ts.en/i18n/app') وربما التخطيط ايضاً ('app/screens/ErrorScreen'). إذا كنت تريد إزالة هذا بالكامل، تحقق من 'app/app.tsp' من اجل عنصر <ErrorBoundary>.",
    reset: "اعادة تعيين التطبيق",
  },
  emptyStateComponent: {
    generic: {
      heading: "فارغة جداً....حزين",
      content: "لا توجد بيانات حتى الآن. حاول النقر فوق الزر لتحديث التطبيق او اعادة تحميله.",
      button: "لنحاول هذا مرّة أخرى",
    },
  },
  list: {
    moreOptions: "خيارات إضافية لـ {{name}}",
    rename: "إعادة التسمية",
    moveUp: "نقل لأعلى",
    moveDown: "نقل لأسفل",
    remove: "إزالة",
    renameTitle: "إعادة تسمية المدينة",
    renameCancel: "إلغاء",
    save: "حفظ",
    useOriginalName: "استخدام «{{name}}»",
    title: "التوقيت العالمي",
    emptyTitle: "لا توجد مدن بعد",
    emptyBody: "أضف مدينة لرؤية وقتها بجانب وقتك.",
    emptyCta: "أضف مدينتك الأولى",
    cityRemoved: "تمت إزالة المدينة",
    undo: "تراجع",
  },
  tabBar: {
    list: "التوقيت العالمي",
    clock: "الساعة",
    map: "الخريطة",
  },
  search: {
    title: "إضافة مدينة",
    placeholder: "ابحث عن المدن",
    close: "إغلاق البحث",
    popular: "الأكثر شيوعًا",
    noResults: "لا توجد مدينة باسم '{{query}}'.",
    offsetHint: "جرّب فارق التوقيت العالمي، مثل +5:30",
    useOffsetMatch: "استخدم {{name}} (يطابق هذا الفارق)",
    focusHint: "اضغط مرتين للتركيز",
    addHint: "اضغط مرتين للإضافة",
    alreadyAdded: "، أُضيفت بالفعل",
  },
  clock: {
    noCity: "لم يتم اختيار مدينة بعد.",
    openSettings: "فتح الإعدادات",
    formatToggle: "تنسيق الوقت",
  },
  settings: {
    title: "الإعدادات",
    close: "إغلاق الإعدادات",
    appearance: "المظهر",
    theme: "السمة",
    themeSystem: "النظام",
    themeLight: "فاتح",
    themeDark: "داكن",
    time: "الوقت",
    use24Hour: "نظام 24 ساعة",
    about: "حول",
    version: "الإصدار",
    cityData: "بيانات المدن",
    mapData: "بيانات الخريطة",
    typeface: "الخط",
    publicDomain: "ملكية عامة",
    timeData: "بيانات المناطق الزمنية",
    timeDataSystem: "النظام",
    timeDataBuiltIn: "جداول مدمجة (حتى 2030)",
  },
  notices: {
    citiesReset:
      "تعذّرت قراءة مدنك المحفوظة، لذا بدأ TimeSpot قائمة جديدة. تم الاحتفاظ بنسخة من البيانات القديمة.",
    prefsReset: "تعذّرت قراءة إعداداتك وأُعيدت إلى القيم الافتراضية.",
    storageReset:
      "تعذّرت قراءة بعض البيانات المحفوظة، لذا بدأ TimeSpot من جديد. تم الاحتفاظ بنسخة.",
    storageRepaired: "تعذّرت قراءة بعض الإدخالات المحفوظة فأُزيلت. كل ما عداها سليم.",
    timeEngineDegraded:
      "دعم المناطق الزمنية على هذا الجهاز محدود، لذا يستخدم TimeSpot جداوله الخاصة. الأوقات دقيقة حتى 2030.",
    dismiss: "حسنًا",
    dismissLabel: "إغلاق هذه الرسالة",
  },
  errors: {
    title: "حدث خطأ ما",
    body: "واجه TimeSpot خطأً لم يتمكن من التعافي منه تلقائيًا. إعادة المحاولة تحل المشكلة عادةً.",
    dataset: "تعذّر تحميل بيانات المدن. أعد المحاولة، وإن تكرر ذلك فأعد تثبيت TimeSpot.",
    retry: "إعادة المحاولة",
    reset: "إعادة تعيين البيانات المحفوظة",
    resetHint: "يمسح مدنك وإعداداتك ثم يعيد المحاولة",
  },
  sun: {
    midnightSun: "شمس منتصف الليل",
    polarNight: "الليل القطبي",
    sunRises: "تشرق الشمس في {{date}}",
    dayLength: "الشمس : {{duration}}",
  },
}

export default ar
