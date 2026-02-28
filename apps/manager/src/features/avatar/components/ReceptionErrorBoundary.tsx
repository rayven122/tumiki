"use client";

/**
 * 受付モード用エラーバウンダリ
 * クラッシュ時にフレンドリーなエラー画面を表示し、自動復帰する
 */

import { Component } from "react";
import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** エラー発生時のリダイレクト先 */
  fallbackRedirect?: string;
};

type State = {
  hasError: boolean;
  countdown: number;
};

const AUTO_RECOVER_SECONDS = 10;

export class ReceptionErrorBoundary extends Component<Props, State> {
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, countdown: AUTO_RECOVER_SECONDS };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true, countdown: AUTO_RECOVER_SECONDS };
  }

  componentDidCatch(error: Error) {
    console.error("受付モードでエラーが発生しました:", error);
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError) {
      // カウントダウン開始
      this.timerId = setInterval(() => {
        this.setState((prev) => {
          const next = prev.countdown - 1;
          if (next <= 0) {
            this.handleRecover();
            return prev;
          }
          return { ...prev, countdown: next };
        });
      }, 1000);
    }
  }

  componentWillUnmount() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  handleRecover = () => {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (this.props.fallbackRedirect) {
      window.location.href = this.props.fallbackRedirect;
    } else {
      this.setState({ hasError: false, countdown: AUTO_RECOVER_SECONDS });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
          <div
            className={cn(
              "max-w-md rounded-3xl px-10 py-8 text-center",
              "border border-white/10 bg-white/5 backdrop-blur-lg",
            )}
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <RefreshCw className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              一時的なエラーが発生しました
            </h2>
            <p className="mt-3 text-sm text-white/60">
              {this.state.countdown}秒後に自動で復帰します
            </p>
            <button
              type="button"
              onClick={this.handleRecover}
              className={cn(
                "mt-6 rounded-full px-8 py-3",
                "bg-white/10 text-white transition-all hover:bg-white/20",
                "text-sm font-medium",
              )}
            >
              今すぐ復帰
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
