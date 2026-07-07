import { useRef, useState, type DragEvent } from 'react'

export default function Dropzone({
  onFile,
  busy,
}: {
  onFile: (file: File) => void
  busy: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  function pick(files: FileList | null) {
    const f = files?.[0]
    if (f) onFile(f)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    pick(e.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
        over ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-400'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".proPlaylist,.pro"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
      <div className="text-5xl">🎼</div>
      <p className="mt-4 text-lg font-medium text-slate-700">
        {busy ? '正在解析…' : '拖入 .proPlaylist 文件，或点击选择'}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        文件只在你的浏览器里处理，不会上传到任何服务器
      </p>
    </div>
  )
}
