import { describe, it, expect } from 'vitest'
import { canonicalFamily, CHURCH_FONT, DEFAULT_TARGET_FONT, FONT_OPTIONS } from '../src/lib/fonts'

describe('canonicalFamily', () => {
  it('maps the brand PostScript name to the church display family', () => {
    // both inconsistent variants seen in the wild collapse to the canonical name
    expect(canonicalFamily('Tensentype-RuiHeiJ-W4', 'Tensentype RuiHeiJ')).toBe(
      'Tensentype RuiHei GB18030 W4',
    )
    expect(canonicalFamily('Tensentype-RuiHeiJ-W4', 'Tensentype-RuiHeiJ-W4')).toBe(
      'Tensentype RuiHei GB18030 W4',
    )
  })

  it('a known font family overrides a spaced current family', () => {
    // PingFang is known, so its canonical family wins even though the current
    // value already contains a space.
    expect(canonicalFamily('PingFangSC-Semibold', 'Ping Fang')).toBe('PingFang SC')
  })

  it('trusts a spaced display family for unknown fonts', () => {
    expect(canonicalFamily('SomeVendor-Cool-W7', 'Some Vendor Cool')).toBe('Some Vendor Cool')
  })

  it('de-hyphenates unknown PostScript names as a fallback', () => {
    expect(canonicalFamily('Foo-Bar-W4', 'Foo-Bar-W4')).toBe('Foo Bar')
  })
})

describe('font presets', () => {
  it('the church brand font is the default target and first option', () => {
    expect(DEFAULT_TARGET_FONT).toBe(CHURCH_FONT)
    expect(FONT_OPTIONS[0]).toBe(CHURCH_FONT)
    expect(CHURCH_FONT.family).toBe('Tensentype RuiHei GB18030 W4')
  })
})
