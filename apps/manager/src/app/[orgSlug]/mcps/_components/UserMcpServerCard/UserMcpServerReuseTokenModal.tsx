"use client";

import { Button } from "@tumiki/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tumiki/ui/dialog";
import { RefreshCw, CheckCircle, Key } from "lucide-react";
import { api, type RouterOutputs } from "@/trpc/react";
import { toast } from "@/lib/client/toast";
import { EntityIcon } from "@/features/shared/components/EntityIcon";
import { cn } from "@/lib/utils";
import { useState } from "react";

type ReusableToken =
  RouterOutputs["oauth"]["findReusableTokens"]["tokens"][number];

type ReuseTokenModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 再利用可能なトークン一覧 */
  reusableTokens: ReusableToken[];
  /** ターゲットとなるインスタンスID */
  targetInstanceId: string;
  /** 新規認証を実行するコールバック */
  onNewAuthentication: () => void;
  /** 再利用成功時のコールバック */
  onSuccess?: () => Promise<void> | void;
};

/**
 * トークン再利用選択モーダル
 *
 * 既存のOAuthトークンを再利用するか、新規認証を行うかを選択する
 */
export const ReuseTokenModal = ({
  open,
  onOpenChange,
  reusableTokens,
  targetInstanceId,
  onNewAuthentication,
  onSuccess,
}: ReuseTokenModalProps) => {
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  const { mutate: reuseToken, isPending } = api.oauth.reuseToken.useMutation({
    onSuccess: async () => {
      toast.success("既存の認証情報を使用しました");
      await onSuccess?.();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleReuseToken = () => {
    if (!selectedTokenId) {
      toast.error("トークンを選択してください");
      return;
    }
    reuseToken({
      sourceTokenId: selectedTokenId,
      targetInstanceId,
    });
  };

  const handleNewAuthentication = () => {
    onOpenChange(false);
    onNewAuthentication();
  };

  // 有効期限をフォーマット
  const formatExpiresAt = (expiresAt: Date | null) => {
    if (!expiresAt) return "無期限";
    const date = new Date(expiresAt);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            認証方法を選択
          </DialogTitle>
          <DialogDescription>
            他のMCPサーバーで認証済みのアカウントがあります。
            既存の認証情報を使用するか、新しく認証を行うか選択してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <p className="text-sm font-medium text-gray-700">
            既存の認証情報を使用
          </p>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {reusableTokens.map((token) => (
              <button
                key={token.tokenId}
                type="button"
                onClick={() => setSelectedTokenId(token.tokenId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  selectedTokenId === token.tokenId
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50",
                )}
              >
                <EntityIcon
                  iconPath={token.iconPath}
                  type="mcp"
                  size="sm"
                  alt={token.mcpServerName}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {token.mcpServerName}
                  </p>
                  <p className="text-xs text-gray-500">
                    有効期限: {formatExpiresAt(token.expiresAt)}
                  </p>
                </div>
                {selectedTokenId === token.tokenId && (
                  <CheckCircle className="h-5 w-5 shrink-0 text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleReuseToken}
            disabled={isPending || !selectedTokenId}
            className="w-full"
          >
            {isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                処理中...
              </>
            ) : (
              "選択した認証情報を使用"
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleNewAuthentication}
            disabled={isPending}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            新しく認証する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
