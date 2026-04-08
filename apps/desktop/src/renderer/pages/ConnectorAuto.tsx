import type { JSX } from "react";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { ArrowLeft, Send, Sparkles, Check, Play } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { TOOLS, MCP_BASE_URL, MCP_CLI_COMMAND } from "../data/mock";

/** AIの応答メッセージ型 */
type Message = { id: string; role: "user" | "ai"; content: string };

export const ConnectorAuto = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "ai",
      content:
        "どのような業務を自動化したいですか？\n例:「GitHub の Issue を週次でまとめて Slack に投稿したい」",
    },
  ]);
  const [generatedConnector, setGeneratedConnector] = useState<{
    name: string;
    tools: { id: string; operations: string[]; description: string }[];
    description: string;
    paths: { ai: string; path: string }[];
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  /** 送信ハンドラ（モック: 2回目のメッセージでコネクタ生成） */
  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // AIの応答をシミュレート
    timerRef.current = setTimeout(() => {
      if (!generatedConnector) {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: `了解しました。「${input}」を実現するために、以下のコネクタを作成しました。\n\n内容を確認して、問題なければ「作成する」を押してください。`,
        };
        setMessages((prev) => [...prev, aiMsg]);

        // モックのコネクタ生成
        const slug = input.replace(/\s+/g, "-").toLowerCase().slice(0, 20);
        setGeneratedConnector({
          name: input.slice(0, 30),
          tools: [
            {
              id: "slack",
              operations: ["send_message", "list_channels"],
              description: "指定チャンネルに週次サマリーを自動投稿する",
            },
            {
              id: "github",
              operations: ["list_repos", "get_file", "create_pr"],
              description:
                "リポジトリのIssue・PR情報を取得しレポートに集約する",
            },
            {
              id: "notion",
              operations: ["create_page", "search_pages"],
              description:
                "週次レポートページを自動作成し、過去のレポートを参照する",
            },
          ],
          description: `${input}を自動化するコネクタ。GitHub の情報を取得し、Notion にまとめ、Slack に通知します。`,
          paths: [
            {
              ai: "Cursor",
              path: `${MCP_CLI_COMMAND} --connector=${slug}`,
            },
            {
              ai: "Claude",
              path: `${MCP_BASE_URL}/custom/${slug}/sse`,
            },
            {
              ai: "ChatGPT",
              path: `${MCP_BASE_URL}/custom/${slug}/http`,
            },
          ],
        });
      } else {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: "コネクタの設定を更新しました。",
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    }, 800);
  };

  return (
    <div className="flex h-full flex-col p-6">
      {/* 戻るリンク */}
      <Link
        to="/tools"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:opacity-80"
      >
        <ArrowLeft size={14} /> コネクト
      </Link>

      <h1 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
        AIで自動作成
      </h1>
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        自動化したい業務を伝えると、AIが最適なコネクタを作成します
      </p>

      {/* チャットエリア */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-line text-[var(--text-primary)] ${
                  msg.role === "user"
                    ? "bg-[var(--bg-active)]"
                    : "bg-[var(--bg-card-hover)]"
                }`}
              >
                {msg.role === "ai" && (
                  <div className="mb-1 flex items-center gap-1 text-[10px] text-[var(--badge-success-text)]">
                    <Sparkles size={10} /> AI
                  </div>
                )}
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* 生成されたコネクタのプレビュー */}
        {generatedConnector && (
          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-[var(--bg-card-hover)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles
                size={14}
                className="text-[var(--badge-success-text)]"
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {generatedConnector.name}
              </span>
            </div>

            {/* 選択されたツール + オペレーション詳細 */}
            <div className="mb-3">
              <span className="text-[10px] text-[var(--text-subtle)]">
                使用ツール
              </span>
              <div className="mt-2 space-y-2">
                {generatedConnector.tools.map((t) => {
                  const tool = TOOLS.find((x) => x.id === t.id);
                  if (!tool) return null;
                  return (
                    <div
                      key={t.id}
                      className="rounded-lg bg-[var(--bg-input)] p-3"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <img
                          src={
                            theme === "dark" ? tool.logoDark : tool.logoLight
                          }
                          alt={tool.name}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {tool.name}
                        </span>
                      </div>
                      {/* オペレーション */}
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        {t.operations.map((op) => (
                          <span
                            key={op}
                            className="rounded bg-[var(--bg-active)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--text-muted)]"
                          >
                            {op}
                          </span>
                        ))}
                      </div>
                      {/* カスタムDescription */}
                      <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">
                        {t.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="mb-3">
              <span className="text-[10px] text-[var(--text-subtle)]">
                Description
              </span>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {generatedConnector.description}
              </p>
            </div>

            {/* ボタン群 */}
            {!saved ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSaved(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2 text-xs font-medium text-[var(--btn-primary-text)] transition-colors hover:opacity-90"
                >
                  <Check size={14} /> 保存する
                </button>
                <button
                  onClick={() => setTesting(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)] transition-colors hover:opacity-80"
                >
                  <Play size={14} /> 検証する
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 保存完了 */}
                <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-2">
                  <Check
                    size={14}
                    className="text-[var(--badge-success-text)]"
                  />
                  <span className="text-xs text-[var(--badge-success-text)]">
                    コネクタを保存しました
                  </span>
                </div>

                {/* 接続パス（保存後に表示） */}
                <div>
                  <span className="text-[10px] text-[var(--text-subtle)]">
                    接続パス
                  </span>
                  {generatedConnector.paths.map((p) => (
                    <div
                      key={p.ai}
                      className="mt-1 flex items-center gap-2 text-[9px]"
                    >
                      <span className="w-14 shrink-0 text-[var(--text-muted)]">
                        {p.ai}
                      </span>
                      <code className="flex-1 truncate rounded bg-[var(--bg-input)] px-1.5 py-0.5 font-mono text-[var(--text-secondary)]">
                        {p.path}
                      </code>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTesting(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)] transition-colors hover:opacity-80"
                  >
                    <Play size={14} /> 検証する
                  </button>
                </div>
              </div>
            )}

            {/* 検証パネル */}
            {testing && (
              <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Play size={12} className="text-[var(--badge-warn-text)]" />
                  <span className="text-[10px] font-medium text-[var(--text-primary)]">
                    検証結果
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-[9px]">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[var(--text-secondary)]">
                      Slack / send_message → 200 OK (142ms)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[var(--text-secondary)]">
                      GitHub / list_repos → 200 OK (210ms)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[var(--text-secondary)]">
                      Notion / create_page → 200 OK (95ms)
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[9px] text-[var(--badge-success-text)]">
                  全ツールの接続を確認しました
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 入力欄 */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="自動化したい業務を入力..."
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
        />
        <button
          onClick={handleSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] transition-colors hover:opacity-80"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
