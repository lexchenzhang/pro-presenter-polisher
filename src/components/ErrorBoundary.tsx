import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Keeps a runtime error from blanking the whole page; shows a recoverable message. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg p-8">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            <p className="font-semibold">出错了</p>
            <p className="mt-1">
              处理这个文件时发生了意外错误。请刷新页面重试；如果反复出现，可能是文件格式不受支持。
            </p>
            <p className="mt-2 font-mono text-xs text-rose-600">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
            >
              重试
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
