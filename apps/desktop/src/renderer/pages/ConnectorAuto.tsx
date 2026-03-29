import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { ArrowLeft, Send, Sparkles, Check } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { TOOLS } from "../data/mock";

/** AIの応答メッセージ型 */
type Message = { role: "user" | "ai"; content: string };

export const ConnectorAuto = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
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

  /** 送信ハンドラ（モック: 2回目のメッセージでコネクタ生成） */
  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // AIの応答をシミュレート
    setTimeout(() => {
      if (!generatedConnector) {
        const aiMsg: Message = {
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
              path: `npx tumiki-mcp@latest --connector=${slug}`,
            },
            {
              ai: "Claude",
              path: `https://mcp.tumiki.cloud/custom/${slug}/sse`,
            },
            {
              ai: "ChatGPT",
              path: `https://mcp.tumiki.cloud/custom/${slug}/http`,
            },
          ],
        });
      } else {
        const aiMsg: Message = {
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
        className="mb-4 inline-flex items-center gap-1 text-sm hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} /> コネクト
      </Link>

      <h1
        className="mb-1 text-lg font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        AIで自動作成
      </h1>
      <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
        自動化したい業務を伝えると、AIが最適なコネクタを作成します
      </p>

      {/* チャットエリア */}
      <div
        className="flex-1 overflow-y-auto rounded-xl p-4"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-line"
                style={{
                  backgroundColor:
                    msg.role === "user"
                      ? "var(--bg-active)"
                      : "var(--bg-card-hover)",
                  color: "var(--text-primary)",
                }}
              >
                {msg.role === "ai" && (
                  <div
                    className="mb-1 flex items-center gap-1 text-[10px]"
                    style={{ color: "var(--badge-success-text)" }}
                  >
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
          <div
            className="mt-4 rounded-xl p-4"
            style={{
              border: "1px solid rgba(52,211,153,0.2)",
              backgroundColor: "var(--bg-card-hover)",
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles
                size={14}
                style={{ color: "var(--badge-success-text)" }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {generatedConnector.name}
              </span>
            </div>

            {/* 選択されたツール + オペレーション詳細 */}
            <div className="mb-3">
              <span
                className="text-[10px]"
                style={{ color: "var(--text-subtle)" }}
              >
                使用ツール
              </span>
              <div className="mt-2 space-y-2">
                {generatedConnector.tools.map((t) => {
                  const tool = TOOLS.find((x) => x.id === t.id);
                  if (!tool) return null;
                  return (
                    <div
                      key={t.id}
                      className="rounded-lg p-3"
                      style={{ backgroundColor: "var(--bg-input)" }}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <img
                          src={
                            theme === "dark" ? tool.logoDark : tool.logoLight
                          }
                          alt={tool.name}
                          className="h-4 w-4 rounded"
                        />
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {tool.name}
                        </span>
                      </div>
                      {/* オペレーション */}
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        {t.operations.map((op) => (
                          <span
                            key={op}
                            className="rounded px-1.5 py-0.5 font-mono text-[8px]"
                            style={{
                              backgroundColor: "var(--bg-active)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {op}
                          </span>
                        ))}
                      </div>
                      {/* カスタムDescription */}
                      <p
                        className="text-[10px] leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {t.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="mb-3">
              <span
                className="text-[10px]"
                style={{ color: "var(--text-subtle)" }}
              >
                Description
              </span>
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {generatedConnector.description}
              </p>
            </div>

            {/* 接続パス */}
            <div className="mb-3">
              <span
                className="text-[10px]"
                style={{ color: "var(--text-subtle)" }}
              >
                接続パス
              </span>
              {generatedConnector.paths.map((p) => (
                <div
                  key={p.ai}
                  className="mt-1 flex items-center gap-2 text-[9px]"
                >
                  <span
                    className="w-14 shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {p.ai}
                  </span>
                  <code
                    className="flex-1 truncate rounded px-1.5 py-0.5 font-mono"
                    style={{
                      backgroundColor: "var(--bg-input)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {p.path}
                  </code>
                </div>
              ))}
            </div>

            {/* 作成ボタン */}
            <button
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
              style={{
                backgroundColor: "var(--btn-primary-bg)",
                color: "var(--btn-primary-text)",
              }}
            >
              <Check size={14} /> 作成する
            </button>
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
          className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-primary)",
          }}
        />
        <button
          onClick={handleSend}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors hover:opacity-80"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
