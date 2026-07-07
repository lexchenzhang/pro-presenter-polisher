// Font presets for normalization.
//
// The source file was authored on Windows with a font that isn't installed on
// the playback Mac, so ProPresenter substitutes it unpredictably. We normalize
// the visible text to a font that ships with macOS. PostScript names must be
// exact or ProPresenter won't match the font.

export interface FontOption {
  /** PostScript name — goes into the structured attribute and the RTF font table. */
  ps: string
  /** Display family name — the cross-platform-safe value for the family field. */
  family: string
  /** Style / weight name. */
  style: string
  /** Human label for the picker (Chinese). */
  label: string
}

// Curated CJK fonts that ship with macOS (safe defaults for a Mac playback box).
export const MAC_CJK_FONTS: FontOption[] = [
  { ps: 'PingFangSC-Semibold', family: 'PingFang SC', style: 'Semibold', label: '苹方-简 中黑体 (PingFang SC Semibold)' },
  { ps: 'PingFangSC-Medium', family: 'PingFang SC', style: 'Medium', label: '苹方-简 中等 (PingFang SC Medium)' },
  { ps: 'PingFangSC-Regular', family: 'PingFang SC', style: 'Regular', label: '苹方-简 常规 (PingFang SC Regular)' },
  { ps: 'STHeitiSC-Medium', family: 'Heiti SC', style: 'Medium', label: '黑体-简 中黑 (Heiti SC Medium)' },
  { ps: 'STSongti-SC-Bold', family: 'Songti SC', style: 'Bold', label: '宋体-简 粗体 (Songti SC Bold)' },
  { ps: 'STSongti-SC-Regular', family: 'Songti SC', style: 'Regular', label: '宋体-简 常规 (Songti SC Regular)' },
  { ps: 'STKaitiSC-Bold', family: 'Kaiti SC', style: 'Bold', label: '楷体-简 粗体 (Kaiti SC Bold)' },
  { ps: 'Yuanti-SC-Bold', family: 'Yuanti SC', style: 'Bold', label: '圆体-简 粗体 (Yuanti SC Bold)' },
]

export const DEFAULT_TARGET_FONT: FontOption = MAC_CJK_FONTS[0]

/**
 * Canonical display family name for a PostScript font name. Fixes the
 * Windows/Mac artifact where the family field sometimes holds the PostScript
 * name (e.g. `Tensentype-RuiHeiJ-W4`) instead of the real family
 * (`Tensentype RuiHeiJ`). Falls back to a heuristic de-hyphenation.
 */
export function canonicalFamily(psName: string, currentFamily: string): string {
  // If the current family already looks like a proper display name (contains a
  // space and isn't identical to the PostScript name), trust it.
  if (currentFamily && currentFamily !== psName && / /.test(currentFamily)) {
    return currentFamily
  }
  const known = MAC_CJK_FONTS.find((f) => f.ps === psName)
  if (known) return known.family
  // Heuristic: drop a trailing weight suffix and turn hyphens into spaces.
  // `Tensentype-RuiHeiJ-W4` -> `Tensentype RuiHeiJ`
  return psName
    .replace(/-(W\d+|Regular|Bold|Semibold|Medium|Light|Thin|Black|Heavy)$/i, '')
    .replace(/-/g, ' ')
    .trim()
}
