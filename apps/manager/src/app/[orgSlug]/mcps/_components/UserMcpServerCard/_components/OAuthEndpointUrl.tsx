"use client";

import { Button } from "@/components/ui/button";
import { Copy, Link2 } from "lucide-react";
import { copyToClipboard } from "@/utils/client/copyToClipboard";
import { toast } from "@/utils/client/toast";
import { makeHttpProxyServerUrl } from "@/utils/url";

type OAuthEndpointUrlProps = {
  userMcpServerId: string;
};

/**
 * OAuth MCPサーバーの接続URLを表示・コピーするコンポーネント
 */
export const OAuthEndpointUrl = ({
  userMcpServerId,
}: OAuthEndpointUrlProps) => {
  const endpointUrl = makeHttpProxyServerUrl(userMcpServerId);

  const handleCopy = async (e: React.MouseEvent) => {
    // カード全体のクリックイベントを防ぐ
    e.stopPropagation();
    await copyToClipboard(endpointUrl);
    toast.success("接続URLをコピーしました");
  };

  /**
   * URLを短縮表示（ドメイン + /mcp/[ID末尾8文字]）
   */
  const truncateUrl = (url: string) => {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const id = path.split("/").pop() ?? "";
    const shortId = id.length > 8 ? `...${id.slice(-8)}` : id;
    return `${urlObj.host}/mcp/${shortId}`;
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
