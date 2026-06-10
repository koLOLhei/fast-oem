import { describe, it, expect } from 'vitest'
import { getJapaneseHolidays, addBusinessDays } from '@/lib/holidays'

describe('getJapaneseHolidays', () => {
    const h2026 = getJapaneseHolidays(2026)

    it('includes the fixed Golden Week holidays', () => {
        expect(h2026.has('2026-05-03')).toBe(true) // 憲法記念日 (Sunday in 2026)
        expect(h2026.has('2026-05-04')).toBe(true) // みどりの日
        expect(h2026.has('2026-05-05')).toBe(true) // こどもの日
    })

    it('cascades the 振替休日 past consecutive holidays (May 3 Sun → May 6)', () => {
        // Regression: the substitute must skip May 4/5 (already holidays) and land
        // on May 6 — not stop at May 4, and not be suppressed by a UTC weekday bug.
        expect(h2026.has('2026-05-06')).toBe(true)
    })

    it('detects 国民の休日 sandwiched between 敬老の日 and 秋分の日', () => {
        expect(h2026.has('2026-09-21')).toBe(true) // 敬老の日
        expect(h2026.has('2026-09-23')).toBe(true) // 秋分の日
        expect(h2026.has('2026-09-22')).toBe(true) // 国民の休日
    })

    it('includes a happy-monday holiday (成人の日 = 2nd Mon of Jan 2026)', () => {
        expect(h2026.has('2026-01-12')).toBe(true)
    })
})

describe('addBusinessDays', () => {
    it('skips weekends and the cascaded GW substitute holiday', () => {
        // Fri May 1 2026 + 1 business day: skips Sat 2, Sun 3, holidays 4/5/6 → Thu May 7
        const result = addBusinessDays(new Date(2026, 4, 1), 1)
        expect([result.getFullYear(), result.getMonth() + 1, result.getDate()]).toEqual([2026, 5, 7])
    })

    it('advances by exactly the requested number of business days when none are holidays', () => {
        // Mon Jun 1 2026 + 4 business days → Fri Jun 5 2026 (no holidays that week)
        const result = addBusinessDays(new Date(2026, 5, 1), 4)
        expect([result.getFullYear(), result.getMonth() + 1, result.getDate()]).toEqual([2026, 6, 5])
    })
})
