import type { FixEdit } from '../lib/analyzer'

export default function ResultPanel({
  blob,
  name,
  plan,
  changedFiles,
}: {
  blob: Blob
  name: string
  plan: FixEdit[]
  changedFiles: number
}) {
  function download() {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-indigo-900">✅ 修复完成</p>
          <p className="mt-1 text-sm text-indigo-800">
            共修改 <strong>{plan.length}</strong> 个文本框，涉及 <strong>{changedFiles}</strong> 个演示文稿。
            原始文件未被改动，下方为新文件。
          </p>
        </div>
        <button
          onClick={download}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          下载修复后的文件
        </button>
      </div>
      <p className="mt-3 text-xs text-indigo-700/70">
        建议：在 Mac 的 ProPresenter 里打开新文件确认显示正常后，再替换原文件。
      </p>
    </div>
  )
}
