// Minimal RTF patching.
//
// ProPresenter stores a legacy RTF copy of each text box alongside the
// structured font attributes. The RTF is trivial (single font table, one or
// more `\fsN` size tokens), so we patch it surgically rather than parsing full
// RTF: rewrite the font name(s) inside the `{\fonttbl ...}` group and rewrite
// every `\fsN` half-point size. Everything else is left byte-for-byte intact.

/** Find the `{\fonttbl ... }` group and return [start, endInclusive], or null. */
function findFontTable(rtf: string): [number, number] | null {
  const start = rtf.indexOf('{\\fonttbl')
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < rtf.length; i++) {
    const c = rtf[i]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return [start, i]
    }
  }
  return null
}

/**
 * In the RTF font table, rename only the entries whose current name is exactly
 * `fromName`, changing them to `toName`. A font entry looks like
 * `\f0\fnil\fcharset0 FontName;` (or `\f0\fnil Name;`).
 *
 * Scoping to `fromName` is essential: a table may declare several fonts (e.g. a
 * fallback `\f1 AppleColorEmoji`). We must swap only the content font and leave
 * every other entry byte-for-byte intact, or unrelated runs render wrong.
 * Returns the patched string; `patchedRtfFontNameCount` reports how many matched.
 */
export function patchRtfFontName(rtf: string, fromName: string, toName: string): string {
  const span = findFontTable(rtf)
  if (!span) return rtf
  const [start, end] = span
  const block = rtf.slice(start, end + 1)
  const patched = block.replace(
    /(\\f\d+\b[^;{}]*?\s)([^;{}]+)(;)/g,
    (whole: string, pre: string, name: string, semi: string) =>
      name === fromName ? pre + toName + semi : whole,
  )
  return rtf.slice(0, start) + patched + rtf.slice(end + 1)
}

/** The distinct font names declared in the RTF font table (for tests/analysis). */
export function rtfFontNames(rtf: string): string[] {
  const span = findFontTable(rtf)
  if (!span) return []
  const block = rtf.slice(span[0], span[1] + 1)
  const names = new Set<string>()
  for (const m of block.matchAll(/\\f\d+\b[^;{}]*?\s([^;{}]+);/g)) names.add(m[1])
  return [...names]
}

/** Set every `\fsN` (half-point) size in the RTF to `pt` points. */
export function patchRtfSize(rtf: string, pt: number): string {
  const half = Math.round(pt * 2)
  return rtf.replace(/\\fs\d+/g, `\\fs${half}`)
}

/** Read the distinct point sizes declared via `\fsN` (for analysis/tests). */
export function readRtfSizes(rtf: string): number[] {
  const out = new Set<number>()
  for (const m of rtf.matchAll(/\\fs(\d+)/g)) out.add(parseInt(m[1], 10) / 2)
  return [...out].sort((a, b) => a - b)
}

/**
 * Best-effort plain text of a text box's RTF, for identifying slides in the UI
 * (e.g. spotting the presentation whose text contains "宣召"). Not a full RTF
 * parser — it strips the font/color tables, unescapes `\uN` code points, drops
 * remaining control words/symbols, and collapses whitespace. ProPresenter
 * stores CJK as literal UTF-8, so most content survives verbatim.
 */
export function rtfPlainText(rtf: string): string {
  let s = rtf
  // Drop the font table group (may hold font names that aren't slide text).
  const span = findFontTable(s)
  if (span) s = s.slice(0, span[0]) + ' ' + s.slice(span[1] + 1)
  // Drop simple color/stylesheet/destination groups (non-nested).
  s = s.replace(/\{\\(?:colortbl|stylesheet|\*)[^{}]*\}/g, ' ')
  // \uN unicode escapes -> the character (with optional skip char after).
  s = s.replace(/\\u(-?\d+)\s?\??/g, (_m, n: string) => String.fromCharCode((parseInt(n, 10) + 0x10000) % 0x10000))
  // \'hh hex escapes -> byte (best effort; usually legacy single-byte).
  s = s.replace(/\\'([0-9a-fA-F]{2})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16)))
  // Remaining control words (\word, optional numeric arg) and control symbols.
  s = s.replace(/\\[a-zA-Z]+-?\d*\s?/g, ' ').replace(/\\[^a-zA-Z]/g, ' ')
  // Braces and RTF field noise.
  s = s.replace(/[{}]/g, ' ')
  return s.replace(/\s+/g, ' ').trim()
}
