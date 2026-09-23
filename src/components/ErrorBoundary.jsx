import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="my-6 mx-auto max-w-xl rounded-2xl border-2 border-rose-200 bg-white p-6 shadow-xl text-slate-800">
          <div className="flex items-center gap-3 text-rose-600 mb-3">
            <div className="rounded-xl bg-rose-100 p-2.5">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Đã xảy ra lỗi khi tải giao diện
              </h3>
              <p className="text-xs text-slate-500">
                Hệ thống đã tự động ngăn lỗi làm trắng màn hình.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs font-mono text-rose-700 border border-slate-200 break-all mb-4">
            {this.state.error?.message || 'Lỗi không xác định'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Thử lại</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Tải lại trang (F5)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
