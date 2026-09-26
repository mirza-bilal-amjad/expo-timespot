import { isTypingTarget, shortcutFor, yieldsToFocusedControl } from "./shortcuts"

const el = (tagName: string, attrs: Record<string, string> = {}, extra = {}) => ({
  tagName,
  getAttribute: (name: string) => attrs[name] ?? null,
  ...extra,
})

describe("shortcutFor (docs/07 §4 table)", () => {
  it("maps the table", () => {
    expect(shortcutFor({ key: "/" })).toBe("search")
    expect(shortcutFor({ key: "1" })).toBe("tabList")
    expect(shortcutFor({ key: "2" })).toBe("tabClock")
    expect(shortcutFor({ key: "3" })).toBe("tabMap")
    expect(shortcutFor({ key: "ArrowUp" })).toBe("previous")
    expect(shortcutFor({ key: "ArrowDown" })).toBe("next")
    expect(shortcutFor({ key: "Enter" })).toBe("open")
    expect(shortcutFor({ key: "ArrowLeft" })).toBe("west")
    expect(shortcutFor({ key: "ArrowRight", shiftKey: true })).toBe("eastZone")
    expect(shortcutFor({ key: "t" })).toBe("theme")
    expect(shortcutFor({ key: "H", shiftKey: true })).toBe("timeFormat")
    expect(shortcutFor({ key: "?", shiftKey: true })).toBe("help")
  })

  it("leaves browser and OS chords alone", () => {
    expect(shortcutFor({ key: "t", metaKey: true })).toBeNull()
    expect(shortcutFor({ key: "1", ctrlKey: true })).toBeNull()
    expect(shortcutFor({ key: "ArrowLeft", altKey: true })).toBeNull()
    expect(shortcutFor({ key: "x" })).toBeNull()
    expect(shortcutFor({ key: "1", shiftKey: true })).toBeNull()
  })
})

describe("isTypingTarget", () => {
  it("is true in text fields", () => {
    expect(isTypingTarget(el("INPUT"))).toBe(true)
    expect(isTypingTarget(el("INPUT", { type: "search" }))).toBe(true)
    expect(isTypingTarget(el("TEXTAREA"))).toBe(true)
    expect(isTypingTarget(el("DIV", {}, { isContentEditable: true }))).toBe(true)
    expect(isTypingTarget(el("DIV", { role: "textbox" }))).toBe(true)
  })

  it("is false elsewhere", () => {
    expect(isTypingTarget(el("BODY"))).toBe(false)
    expect(isTypingTarget(el("INPUT", { type: "checkbox" }))).toBe(false)
    expect(isTypingTarget(el("DIV", { role: "button" }))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})

describe("yieldsToFocusedControl", () => {
  it("Enter presses a focused button instead", () => {
    expect(yieldsToFocusedControl("open", el("DIV", { role: "button" }))).toBe(true)
    expect(yieldsToFocusedControl("open", el("BODY"))).toBe(false)
  })

  it("arrows adjust a focused slider instead, but still move from a clicked row", () => {
    expect(yieldsToFocusedControl("west", el("DIV", { role: "slider" }))).toBe(true)
    expect(yieldsToFocusedControl("next", el("DIV", { role: "button" }))).toBe(false)
  })

  it("other shortcuts never yield", () => {
    expect(yieldsToFocusedControl("theme", el("DIV", { role: "button" }))).toBe(false)
  })
})
