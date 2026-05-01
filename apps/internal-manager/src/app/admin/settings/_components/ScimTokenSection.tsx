"use client";

import { useRef, useState } from "react";
import { Copy, RefreshCw, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tumiki/ui/dialog";
import { api } from "~/trpc/react";

const inputCls =
  "bg-bg-app border-border-default text-text-secondary w-full rounded-lg border px-3 py-2 text-xs outline-none";

/** SCIMトークン管理セクション */
const ScimTokenSection = () => {
  const utils = api.useUtils();
  const { data: current, isLoading } = api.scimToken.getCurrent.useQuery();

  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generate = api.scimToken.generate.useMutation({
    onSuccess: (data) => {
      setNewToken(data.token);
      void utils.scimToken.getCurrent.invalidate();
    },
  });

  const revoke = api.scimToken.revoke.useMutation({
    onSuccess: () => void utils.scimToken.getCurrent.invalidate(),
  });

  const handleGenerate = () => {
    const message = current
      ? "SCIMトークンを再発行しますか？\n\n既存のトークンは即座に無効になります。IDPのSCIM設定で新しいトークンに更新してください。"
      : "SCIMトークンを生成しますか？\n\n生成されたトークンはIDPのSCIM設定に入力してください。トークンはこの画面でのみ表示されます。";
    if (window.confirm(message)) {
      generate.mutate();
    }
  };

  const handleRevoke = () => {
    if (
      window.confirm(
        "SCIMトークンを失効しますか？\n\nトークンを削除するとSCIM連携が停止します。IDPのプロビジョニング設定も無効化してください。",
      )
    ) {
      revoke.mutate();
    }
  };

  const handleCopy = () => {
    if (!newToken) return;
    void navigator.clipboard.writeText(newToken);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const scimEndpointUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/scim/v2`
      : "/api/scim/v2";

  return (
    <div className="space-y-3">
      {/* SCIMエンドポイントURL */}
      <div>
        <label className="text-text-secondary mb-1 block text-[11px]">
          SCIMエンドポイントURL
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={scimEndpointUrl}
            readOnly
            className={`${inputCls} flex-1 font-mono`}
          />
        </div>
      </div>

      {/* SCIMトークン */}
      <div>
        <label className="text-text-secondary mb-1 block text-[11px]">
          SCIMトークン
        </label>

        {isLoading ? (
          <div className="bg-bg-app border-border-default text-text-muted rounded-lg border px-3 py-2 text-xs">
            読み込み中…
          </div>
        ) : current ? (
          /* トークン設定済み */
          <div className="space-y-2">
            <div className="bg-bg-app border-border-default flex items-center gap-2 rounded-lg border px-3 py-2">
              <span className="text-text-muted flex-1 font-mono text-xs">
                {current.hint}
              </span>
              <span className="text-text-muted text-[10px]">
                {new Date(current.createdAt).toLocaleDateString("ja-JP")} 生成
              </span>
            </div>
            <div className="flex gap-2">
              {/* 再発行 */}
              <button
                type="button"
                disabled={generate.isPending}
                onClick={handleGenerate}
                className="bg-bg-active text-text-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                <RefreshCw size={11} />
                再発行
              </button>

              {/* 失効 */}
              <button
                type="button"
                disabled={revoke.isPending}
                onClick={handleRevoke}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-400 transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                <Trash2 size={11} />
                失効
              </button>
            </div>
          </div>
        ) : (
          /* トークン未設定 */
          <div className="space-y-2">
            <div className="bg-bg-app border-border-default text-text-muted rounded-lg border px-3 py-2 text-xs">
              未設定
            </div>
            <button
              type="button"
              disabled={generate.isPending}
              onClick={handleGenerate}
              className="bg-btn-primary-bg text-btn-primary-text flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <RefreshCw size={11} />
              トークンを生成
            </button>
          </div>
        )}
      </div>

      {/* 生成完了ダイアログ（トークン一度きり表示） */}
      <Dialog
        open={!!newToken}
        onOpenChange={(open) => !open && setNewToken(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SCIMトークンが生成されました</DialogTitle>
            <DialogDescription>
              このトークンは一度しか表示されません。今すぐコピーしてIDPのSCIM設定に入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="bg-bg-app border-border-default my-2 rounded-lg border px-3 py-3">
            <code className="text-text-primary text-xs break-all">
              {newToken}
            </code>
          </div>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="bg-bg-active text-text-secondary flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs transition-opacity hover:opacity-80"
            >
              <Copy size={12} />
              {copied ? "コピー済み" : "コピー"}
            </button>
            <button
              type="button"
              onClick={() => setNewToken(null)}
              className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-4 py-2 text-xs transition-opacity hover:opacity-80"
            >
              閉じる
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScimTokenSection;
