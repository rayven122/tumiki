"use client";

import { Button } from "@tumiki/ui/button";
import { Copy, Link2 } from "lucide-react";
import { copyToClipboard } from "@/lib/client/copyToClipboard";
import { toast } from "@/lib/client/toast";
import { makeHttpProxyServerUrl } from "@/lib/url";

type OAuthEndpointUrlProps = {
  userMcpServerSlug: string;
};

/**
 * OAuth MCPサーバーの接続URLを表示・コピーするコンポーネント
 */
export const OAuthEndpointUrl = ({
  userMcpServerSlug,
}: OAuthEndpointUrlProps) => {
  const endpointUrl = makeHttpProxyServerUrl(userMcpServerSlug);

  const handleCopy = async (e: React.MouseEvent) => {
    // カード全体のクリックイベントを防ぐ
    e.stopPropagation();
    await copyToClipboard(endpointUrl);
    toast.success("接続URLをコピーしました");
  };

  /**
   * URLを短縮表示（ドメイン + /mcp/[slug]）
   */
  const truncateUrl = (url: string) => {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const slug = path.split("/").pop() ?? "";
    // slugが長い場合は末尾を省略
    const shortSlug = slug.length > 15 ? `${slug.slice(0, 15)}...` : slug;
    return `${urlObj.host}/mcp/${shortSlug}`;
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex w-full items-center justify-between"
      onClick={handleCopy}
    >
      <span className="flex min-w-0 items-center">
        <Link2 className="mr-2 size-4 shrink-0" />
        <code className="truncate text-xs">{truncateUrl(endpointUrl)}</code>
      </span>
      <Copy className="ml-2 size-4 shrink-0" />
    </Button>
  );
};
