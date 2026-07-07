import { MAC_CJK_FONTS } from '../lib/fonts'
import type { FixConfig, PlaylistReport, SizePolicy } from '../lib/analyzer'

const SIZE_POLICIES: { value: SizePolicy; label: string; hint: string }[] = [
  { value: 'keep', label: '保持字号不变', hint: '推荐 — 只统一字体，字号原样保留' },
  { value: 'box-group', label: '统一同一文本框', hint: '同一个框在不同幻灯片间取众数，跨框不动' },
  { value: 'file-mode', label: '每篇取众数', hint: '注意：可能压平同文件里本该不同的框' },
  { value: 'global', label: '全部统一为固定字号', hint: '整个 playlist 的主文本用同一字号' },
]

export default function ConfigPanel({
  config,
  report,
  onChange,
}: {
  config: FixConfig
  report: PlaylistReport
  onChange: (next: FixConfig) => void
}) {
  const set = (patch: Partial<FixConfig>) => onChange({ ...config, ...patch })

  const distinctPs = [...new Set(report.contentFonts.map((f) => f.ps))]

  function toggleSource(ps: string) {
    const has = config.sourcePsNames.includes(ps)
    set({
      sourcePsNames: has
        ? config.sourcePsNames.filter((p) => p !== ps)
        : [...config.sourcePsNames, ps],
    })
  }

  return (
    <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-800">修复选项</h2>

      {/* 字体 */}
      <section className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={config.remapFont}
            onChange={(e) => set({ remapFont: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          统一字体为 Mac 系统字体
        </label>
        {config.remapFont && (
          <select
            value={config.targetFont.ps}
            onChange={(e) => {
              const f = MAC_CJK_FONTS.find((x) => x.ps === e.target.value)
              if (f) set({ targetFont: f })
            }}
            className="ml-6 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {MAC_CJK_FONTS.map((f) => (
              <option key={f.ps} value={f.ps}>
                {f.label}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={config.fixFamilyMeta}
            onChange={(e) => set({ fixFamilyMeta: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          修复字体元数据（消除 Windows/Mac 家族名不一致）
        </label>
      </section>

      {/* 字号 */}
      <section className="space-y-2">
        <div className="text-sm font-medium text-slate-700">字号</div>
        {SIZE_POLICIES.map((p) => (
          <label key={p.value} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="sizePolicy"
              checked={config.sizePolicy === p.value}
              onChange={() => set({ sizePolicy: p.value })}
              className="mt-1 h-4 w-4 border-slate-300 text-indigo-600"
            />
            <span>
              <span className="text-slate-700">{p.label}</span>
              <span className="ml-2 text-xs text-slate-400">{p.hint}</span>
            </span>
          </label>
        ))}
        {config.sizePolicy === 'global' && (
          <div className="ml-6 flex items-center gap-2 text-sm">
            <span className="text-slate-600">字号</span>
            <input
              type="number"
              min={8}
              max={800}
              value={config.globalSize}
              onChange={(e) => set({ globalSize: Number(e.target.value) })}
              className="w-24 rounded-lg border border-slate-300 px-2 py-1"
            />
            <span className="text-slate-500">pt</span>
          </div>
        )}
      </section>

      {/* 高级：处理哪些字体 */}
      {distinctPs.length > 1 && (
        <section className="space-y-2">
          <div className="text-sm font-medium text-slate-700">处理哪些内容字体</div>
          <p className="text-xs text-slate-400">
            只有这些字体的文本框会被修改（其它如计时器、字幕等保持不动）
          </p>
          <div className="flex flex-wrap gap-2">
            {distinctPs.map((ps) => (
              <label
                key={ps}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
              >
                <input
                  type="checkbox"
                  checked={config.sourcePsNames.includes(ps)}
                  onChange={() => toggleSource(ps)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                />
                {ps}
              </label>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
