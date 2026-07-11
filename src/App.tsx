import { useCallback, useMemo, useState } from 'react'
import { loadPlaylist, savePlaylist, suggestOutputName, type LoadedPlaylist } from './lib/playlist'
import { buildDocs, defaultConfig, applyPlan, serializeChangedDocs } from './lib/fixer'
import {
  analyze,
  buildPlan,
  type FileEntry,
  type FixConfig,
  type FixEdit,
  type PlaylistReport,
} from './lib/analyzer'
import Dropzone from './components/Dropzone'
import PrivacyNote from './components/PrivacyNote'
import SummaryCards from './components/SummaryCards'
import ConfigPanel from './components/ConfigPanel'
import ReportTable from './components/ReportTable'
import ResultPanel from './components/ResultPanel'

interface Loaded {
  file: File
  pl: LoadedPlaylist
  files: FileEntry[]
  report: PlaylistReport
  failed: { name: string; error: string }[]
}

interface Result {
  blob: Blob
  name: string
  plan: FixEdit[]
  changedFiles: number
}

export default function App() {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [config, setConfig] = useState<FixConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const onFile = useCallback(async (file: File) => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const pl = await loadPlaylist(file, file.name)
      if (pl.proNames.length === 0) {
        throw new Error('这个文件里没有找到 ProPresenter 演示文稿（.pro）。请确认选择的是 .proPlaylist 文件。')
      }
      const { files, failed } = await buildDocs(pl)
      if (files.length === 0) {
        throw new Error('所有演示文稿都无法解析，可能不是有效的 ProPresenter 7 文件。')
      }
      const report = analyze(files)
      setLoaded({ file, pl, files, report, failed })
      setConfig(defaultConfig(report))
    } catch (e) {
      setError(`解析失败：${e instanceof Error ? e.message : String(e)}`)
      setLoaded(null)
      setConfig(null)
    } finally {
      setBusy(false)
    }
  }, [])

  // Preview is read-only: buildPlan inspects the (unmutated) documents.
  const preview = useMemo<FixEdit[]>(() => {
    if (!loaded || !config) return []
    try {
      return buildPlan(loaded.files, config)
    } catch {
      return []
    }
  }, [loaded, config])

  const onApply = useCallback(async () => {
    if (!loaded || !config) return
    setBusy(true)
    setError(null)
    try {
      // Re-parse from the original file so repeated applies always start clean.
      const pl = await loadPlaylist(loaded.file, loaded.file.name)
      const { files } = await buildDocs(pl)
      const plan = buildPlan(files, config)
      applyPlan(plan)
      const updated = serializeChangedDocs(files, plan)
      const blob = await savePlaylist(pl, updated)
      setResult({ blob, name: suggestOutputName(loaded.file.name), plan, changedFiles: updated.size })
    } catch (e) {
      setError(`修复失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }, [loaded, config])

  function reset() {
    setLoaded(null)
    setConfig(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">崇拜幻灯片格式统一工具</h1>
        <p className="mt-1 text-sm text-slate-500">
          自动检查并统一 ProPresenter 演示文稿的字体，修复 Windows 制作、Mac 播放时的字体不一致。
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loaded ? (
        <div className="space-y-6">
          <Dropzone onFile={onFile} busy={busy} />
          <PrivacyNote />
        </div>
      ) : (
        config && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                已加载：<span className="font-medium text-slate-800">{loaded.file.name}</span>
              </div>
              <button onClick={reset} className="text-sm text-indigo-600 hover:underline">
                重新选择文件
              </button>
            </div>

            {loaded.failed.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                有 {loaded.failed.length} 个演示文稿无法解析，已跳过：
                {loaded.failed.map((f) => f.name).join('、')}
              </div>
            )}

            <SummaryCards report={loaded.report} />
            <ConfigPanel config={config} report={loaded.report} onChange={setConfig} />

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-600">
                {preview.length > 0 ? (
                  <>
                    将修改 <strong className="text-indigo-600">{preview.length}</strong> 个文本框
                  </>
                ) : (config.selectedFiles?.length ?? 0) === 0 ? (
                  '请先在上方勾选要处理的篇目（如宣召、读经）'
                ) : (
                  '当前设置下没有需要修改的内容'
                )}
              </div>
              <button
                onClick={onApply}
                disabled={busy || preview.length === 0}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busy ? '处理中…' : '应用并生成文件'}
              </button>
            </div>

            {result && <ResultPanel {...result} />}

            <ReportTable report={loaded.report} edits={preview} />
          </div>
        )
      )}

      <footer className="mt-12 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        全部在浏览器本地处理 · 开源于 GitHub
      </footer>
    </div>
  )
}
