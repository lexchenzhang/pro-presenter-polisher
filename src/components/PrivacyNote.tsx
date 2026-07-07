export default function PrivacyNote() {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
      <p className="font-medium">🔒 隐私说明</p>
      <p className="mt-1 leading-relaxed">
        本工具完全在你的浏览器里运行，教会的崇拜文件<strong>不会被上传</strong>到任何服务器，
        也不会离开你的电脑。修复后的文件由浏览器直接生成并下载。
      </p>
    </div>
  )
}
