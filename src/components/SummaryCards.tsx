import type { PlaylistReport } from '../lib/analyzer'

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-800">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

export default function SummaryCards({ report }: { report: PlaylistReport }) {
  const mainFont = report.sourcePsNames[0] ?? '—'
  const sizes = report.distinctSizes
  const sizeRange = sizes.length ? `${sizes[0]}–${sizes[sizes.length - 1]} pt` : '—'
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card label="演示文稿" value={String(report.files)} hint={`${report.contentBoxes} 个主文本框`} />
      <Card label="检测到的主字体" value={mainFont} hint="将被统一处理" />
      <Card
        label="字体元数据待修复"
        value={String(report.metaIssues)}
        hint="Windows/Mac 家族名不一致"
      />
      <Card label="当前字号范围" value={sizeRange} hint={`${sizes.length} 种不同字号`} />
    </div>
  )
}
