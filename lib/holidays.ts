/**
 * Japanese national holiday calculator — no external dependencies.
 * Supports years 1980–2099.
 *
 * Holidays implemented:
 *  - All fixed-date holidays (元旦, 建国記念の日, 天皇誕生日, 昭和の日, 憲法記念日,
 *    みどりの日, こどもの日, 山の日, 文化の日, 勤労感謝の日)
 *  - All movable happy-monday holidays (成人の日, 海の日, 敬老の日, スポーツの日)
 *  - Vernal and autumnal equinox (春分の日, 秋分の日) via approximation formula
 *  - 振替休日 (substitute holiday when a holiday falls on Sunday)
 *  - 国民の休日 (sandwiched weekday between two holidays)
 */

function toKey(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Day-of-month for the Nth Monday of a given month. */
function nthMonday(year: number, month: number, n: number): number {
    const firstDow = new Date(year, month - 1, 1).getDay() // 0=Sun
    const firstMonday = firstDow === 1 ? 1 : firstDow === 0 ? 2 : 9 - firstDow
    return firstMonday + (n - 1) * 7
}

/** Vernal equinox day for the given year (approximate, valid 1980–2099). */
function springEquinoxDay(year: number): number {
    return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

/** Autumnal equinox day for the given year (approximate, valid 1980–2099). */
function autumnEquinoxDay(year: number): number {
    return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

/**
 * Returns a Set of 'YYYY-MM-DD' strings that are Japanese public holidays
 * (including 振替休日 and 国民の休日) for the given year.
 */
export function getJapaneseHolidays(year: number): Set<string> {
    const h = new Set<string>()
    const add = (m: number, d: number) => h.add(toKey(year, m, d))

    // ── Fixed holidays ──────────────────────────────────────────────────────
    add(1, 1)    // 元旦
    add(2, 11)   // 建国記念の日
    add(2, 23)   // 天皇誕生日 (2019〜; before 2019 it was Dec 23, irrelevant for future dates)
    add(4, 29)   // 昭和の日
    add(5, 3)    // 憲法記念日
    add(5, 4)    // みどりの日
    add(5, 5)    // こどもの日
    add(8, 11)   // 山の日 (2016〜)
    add(11, 3)   // 文化の日
    add(11, 23)  // 勤労感謝の日

    // ── Happy Monday holidays ────────────────────────────────────────────────
    add(1, nthMonday(year, 1, 2))    // 成人の日 (2nd Mon of Jan)
    add(7, nthMonday(year, 7, 3))    // 海の日 (3rd Mon of Jul)
    add(9, nthMonday(year, 9, 3))    // 敬老の日 (3rd Mon of Sep)
    add(10, nthMonday(year, 10, 2))  // スポーツの日 (2nd Mon of Oct)

    // ── Equinox holidays ─────────────────────────────────────────────────────
    add(3, springEquinoxDay(year))   // 春分の日
    add(9, autumnEquinoxDay(year))   // 秋分の日

    // ── 振替休日: holiday on Sunday → next Monday is substitute holiday ──────
    const base = [...h]
    for (const dateStr of base) {
        const d = new Date(dateStr + 'T00:00:00+09:00')
        if (d.getDay() === 0) {
            const next = new Date(d)
            next.setDate(next.getDate() + 1)
            h.add(toKey(next.getFullYear(), next.getMonth() + 1, next.getDate()))
        }
    }

    // ── 国民の休日: non-holiday weekday sandwiched between two holidays ────────
    // Most relevant pattern: when 敬老の日 and 秋分の日 are separated by one weekday.
    // Iterate all days in September to detect this:
    for (let day = 1; day <= 30; day++) {
        const d = new Date(year, 8, day) // September (0-indexed)
        if (d.getDay() === 0 || d.getDay() === 6) continue
        const key = toKey(year, 9, day)
        if (h.has(key)) continue
        const prev = toKey(year, 9, day - 1)
        const next = toKey(year, 9, day + 1)
        if (h.has(prev) && h.has(next)) h.add(key)
    }

    return h
}

// Cache to avoid recalculating holidays for the same year repeatedly.
const _holidayCache = new Map<number, Set<string>>()
function holidaysForYear(year: number): Set<string> {
    if (!_holidayCache.has(year)) _holidayCache.set(year, getJapaneseHolidays(year))
    return _holidayCache.get(year)!
}

/**
 * Add `days` business days to `date`, skipping weekends AND Japanese national holidays.
 * Replaces the simple addBusinessDays that only skipped weekends.
 */
export function addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date)
    let added = 0
    while (added < days) {
        result.setDate(result.getDate() + 1)
        const dow = result.getDay()
        if (dow === 0 || dow === 6) continue // weekend
        const key = toKey(result.getFullYear(), result.getMonth() + 1, result.getDate())
        if (holidaysForYear(result.getFullYear()).has(key)) continue // holiday
        added++
    }
    return result
}
