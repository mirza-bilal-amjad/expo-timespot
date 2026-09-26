/**
 * docs/10 task 6.1: the search names load on demand. Before they arrive,
 * search still works on display names; after, alternate names match too.
 * Isolated modules, so this file sees the index before any load.
 */
describe("search before and after the search names load", () => {
  it("finds cities by display name first, and by alternate name once loaded", async () => {
    let search!: typeof import("./search")
    jest.isolateModules(() => {
      search = require("./search")
    })
    expect(search.hasSearchNames()).toBe(false)
    expect(search.searchCities("tokyo")[0]?.name).toBe("Tokyo")
    // "Bombai" is one of Mumbai's alternate names — unknown until loaded.
    expect(search.searchCities("bombai").some((c) => c.name === "Mumbai")).toBe(false)

    await search.loadSearchNames()
    expect(search.hasSearchNames()).toBe(true)
    expect(search.searchCities("bombai").some((c) => c.name === "Mumbai")).toBe(true)
  })

  it("ignores a search file that doesn't line up with the dataset", () => {
    let search!: typeof import("./search")
    jest.isolateModules(() => {
      search = require("./search")
    })
    expect(search.applySearchNames({ asciiName: ["x"], altNames: [[]] })).toBe(false)
    expect(search.hasSearchNames()).toBe(false)
  })
})
