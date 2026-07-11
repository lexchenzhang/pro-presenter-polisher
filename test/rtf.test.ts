import { describe, it, expect } from 'vitest'
import { patchRtfFontName, patchRtfSize, readRtfSizes, rtfFontNames, rtfPlainText } from '../src/lib/rtf'

const SINGLE = '{\\rtf1\\ansi{\\fonttbl\\f0\\fnil\\fcharset0 Tensentype-RuiHeiJ-W4;}}\\f0\\fs330 hi'
// A real multi-entry table: a content font plus an emoji fallback.
const MULTI =
  '{\\rtf1\\ansi{\\fonttbl\\f0\\fnil\\fcharset0 Tensentype-RuiHeiJ-W4;\\f1\\fnil\\fcharset0 AppleColorEmoji;}}\\f0\\fs330 a \\f1\\fs330 😀'
const RTF0 = '{\\rtf0\\ansi\\ansicpg1252{\\fonttbl\\f0\\fnil ArialMT;}}\\f0\\fs100 x'

describe('patchRtfFontName (scoped)', () => {
  it('renames only the matching font entry', () => {
    const out = patchRtfFontName(SINGLE, 'Tensentype-RuiHeiJ-W4', 'PingFangSC-Semibold')
    expect(rtfFontNames(out)).toEqual(['PingFangSC-Semibold'])
  })

  it('leaves other entries (emoji/fallback) untouched — the blocking bug', () => {
    const out = patchRtfFontName(MULTI, 'Tensentype-RuiHeiJ-W4', 'PingFangSC-Semibold')
    expect(rtfFontNames(out).sort()).toEqual(['AppleColorEmoji', 'PingFangSC-Semibold'])
    expect(out).toContain('AppleColorEmoji')
  })

  it('handles the \\rtf0 variant (no fcharset)', () => {
    const out = patchRtfFontName(RTF0, 'ArialMT', 'PingFangSC-Semibold')
    expect(rtfFontNames(out)).toEqual(['PingFangSC-Semibold'])
  })

  it('is a no-op when the source name is absent', () => {
    const out = patchRtfFontName(MULTI, 'NotPresent', 'PingFangSC-Semibold')
    expect(out).toBe(MULTI)
  })
})

describe('rtfPlainText', () => {
  it('extracts literal (CJK) slide text and drops the font table', () => {
    const rtf =
      '{\\rtf1\\ansi{\\fonttbl\\f0\\fnil\\fcharset0 Tensentype-RuiHeiJ-W4;}}\\f0\\fs350 宣召'
    expect(rtfPlainText(rtf)).toBe('宣召')
  })

  it('drops color tables and keeps only the text', () => {
    const rtf =
      '{\\rtf1{\\fonttbl\\f0\\fnil A;}{\\colortbl;\\red0\\green0\\blue0;}\\f0\\fs100\\cf1 读经 约翰福音}'
    expect(rtfPlainText(rtf)).toBe('读经 约翰福音')
  })

  it('is empty for a text-free box', () => {
    expect(rtfPlainText('{\\rtf1{\\fonttbl\\f0\\fnil A;}}\\f0\\fs100 ')).toBe('')
  })
})

describe('patchRtfSize', () => {
  it('rewrites all \\fsN to the point size in half-points', () => {
    expect(readRtfSizes(patchRtfSize(MULTI, 100))).toEqual([100])
    expect(patchRtfSize(SINGLE, 60)).toContain('\\fs120')
  })

  it('does not touch control words that merely start with \\fs', () => {
    const s = '{\\rtf1{\\fonttbl\\f0\\fnil A;}}\\fscaps0\\fs200 x'
    const out = patchRtfSize(s, 50)
    expect(out).toContain('\\fscaps0')
    expect(out).toContain('\\fs100')
  })
})
