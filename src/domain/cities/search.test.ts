import { getCityByZone, getPopularCities, getRepresentativeCity, searchCities } from "./search"

describe("searchCities", () => {
  it("returns [] for an empty or whitespace-only query", () => {
    expect(searchCities("")).toEqual([])
    expect(searchCities("   ")).toEqual([])
  })

  it("'tok' ranks Tokyo first via an exact asciiName prefix match", () => {
    const results = searchCities("tok")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe("gn-1850147") // Tokyo
  })

  it("'koln' finds Koeln (Cologne) via the fuzzy tier — asciiName is 'Koeln', a 1-edit gap from the normalized query", () => {
    const results = searchCities("koln")
    expect(results.some((c) => c.id === "gn-2886242")).toBe(true)
  })

  it("diacritics in the query are stripped — 'köln' matches the same as 'koln'", () => {
    const withDiacritic = searchCities("köln").map((c) => c.id)
    const stripped = searchCities("koln").map((c) => c.id)
    expect(withDiacritic).toEqual(stripped)
  })

  it("'berln' (one letter short) finds Berlin via the fuzzy tier", () => {
    // docs/06-data-model.md §3's own example, 'nwyork' -> New York, doesn't
    // survive contact with the real GeoNames name: it's "New York City" (three
    // words), and a single unsplit query term can't fuzzy-match across uFuzzy's
    // word-boundary term splitting. Berlin is a real, verified single-word case.
    const results = searchCities("berln")
    expect(results.some((c) => c.id === "gn-2950159")).toBe(true)
  })

  it("a country name surfaces its cities via the country-match tier", () => {
    const results = searchCities("germany")
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((c) => c.country === "Germany")).toBe(true)
  })

  it("ranks a big-population exact match above a small-population one for the same prefix tier", () => {
    // Both "Berlin" (DE, huge) and any small "Berlin*"-prefixed place should
    // exist; the huge one must outrank it at the same weight tier.
    const results = searchCities("berlin")
    const berlin = results.find((c) => c.asciiName === "Berlin" && c.countryCode === "DE")
    expect(berlin).toBeDefined()
    expect(results[0].id).toBe(berlin!.id)
  })

  it("honors the limit parameter", () => {
    const results = searchCities("san", 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it("stays under the 30ms budget across a spread of query shapes", () => {
    const queries = ["a", "san", "new", "lond", "xyzabc123", "köln", "germany", "st"]
    for (const q of queries) {
      const start = performance.now()
      searchCities(q)
      const elapsed = performance.now() - start
      expect(elapsed).toBeLessThan(30)
    }
  })
})

describe("getCityByZone", () => {
  it("returns the highest-population city for a zone with several", () => {
    const city = getCityByZone("Asia/Kolkata")
    expect(city).toBeDefined()
    // Mumbai (Asia/Kolkata's highest-population representative) should win.
    expect(city!.asciiName).toBe("Mumbai")
  })

  it("returns undefined for a zone with no representative", () => {
    expect(getCityByZone("Asia/Calcutta")).toBeUndefined()
  })
})

describe("getRepresentativeCity", () => {
  it("finds a city at UTC+9 (Tokyo's fixed offset)", () => {
    const now = Date.UTC(2026, 5, 15)
    const city = getRepresentativeCity(540, now)
    expect(city).toBeDefined()
    expect(city!.zone).toMatch(/^Asia\//)
  })

  it("returns undefined for an offset nothing currently sits at", () => {
    const now = Date.UTC(2026, 5, 15)
    expect(getRepresentativeCity(841, now)).toBeUndefined() // one past UTC+14, the max
  })
})

describe("getPopularCities", () => {
  it("returns the top N cities by population, descending", () => {
    const top5 = getPopularCities(5)
    expect(top5).toHaveLength(5)
    for (let i = 1; i < top5.length; i++) {
      expect(top5[i - 1].population).toBeGreaterThanOrEqual(top5[i].population)
    }
  })

  it("defaults to 12", () => {
    expect(getPopularCities()).toHaveLength(12)
  })
})
