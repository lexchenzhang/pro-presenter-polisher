// Font presets for normalization.
//
// The playback Mac has the church's brand font installed, so the default is to
// unify the lyric/content text onto that brand font with consistent metadata.
// The curated macOS fonts below stay available as fallbacks (e.g. if a machine
// lacks the brand font). PostScript names must be exact or ProPresenter won't
// match the font.

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

// ---------------------------------------------------------------------------
// Church brand font (the default target).
//
// The font the church uses and has installed on the playback Mac. Its display
// name (macOS 字体册/Font Book) is "Tensentype RuiHei GB18030 W4"; its
// PostScript name — confirmed from Font Book (2026-07-10) — is
// `Tensentype-RuiHeiJ-W4`, which is already on every content box in the files.
// Because `ps` matches what's in the file, the default fix is a family/metadata
// normalization, NOT a font swap, and it leaves `style` untouched.
//
// If you ever retarget to a *different* installed font: ProPresenter matches by
// the exact PostScript name (not the display name), so set `ps` to that font's
// PostScript name AND set `style` to its real weight name — on that (swap) path
// the value below is written to the file (`Regular` here is only a placeholder;
// the PostScript name says W4).
export const CHURCH_FONT: FontOption = {
  ps: 'Tensentype-RuiHeiJ-W4', // 已用字体册确认 (2026-07-10)
  family: 'Tensentype RuiHei GB18030 W4',
  style: 'Regular', // 仅在 ps 改成别的字体（触发替换）时才写入
  label: '锐黑 GB18030 W4（教会品牌字体 · Tensentype RuiHei GB18030 W4）',
}

// Curated CJK fonts that ship with macOS (fallbacks if the brand font is absent).
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

// Every font the tool knows a canonical family for (brand font first so it wins
// the picker's default slot).
export const FONT_OPTIONS: FontOption[] = [CHURCH_FONT, ...MAC_CJK_FONTS]

export const DEFAULT_TARGET_FONT: FontOption = CHURCH_FONT

/**
 * Canonical display family name for a PostScript font name. Fixes the
 * Windows/Mac artifact where the family field sometimes holds the PostScript
 * name (e.g. `Tensentype-RuiHeiJ-W4`) instead of the intended display family
 * (`Tensentype RuiHei GB18030 W4`). Falls back to a heuristic de-hyphenation.
 */
export function canonicalFamily(psName: string, currentFamily: string): string {
  // A known font's family is authoritative — it overrides whatever the file
  // currently carries (which may be an inconsistent display name).
  const known = FONT_OPTIONS.find((f) => f.ps === psName)
  if (known) return known.family
  // If the current family already looks like a proper display name (contains a
  // space and isn't identical to the PostScript name), trust it.
  if (currentFamily && currentFamily !== psName && / /.test(currentFamily)) {
    return currentFamily
  }
  // Heuristic: drop a trailing weight suffix and turn hyphens into spaces.
  return psName
    .replace(/-(W\d+|Regular|Bold|Semibold|Medium|Light|Thin|Black|Heavy)$/i, '')
    .replace(/-/g, ' ')
    .trim()
}
