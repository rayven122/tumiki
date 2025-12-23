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
    <div
      className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2"
      onClick={(e) => e.stopPropagation()}
    >
      <Link2 className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
      <code className="min-w-0 flex-1 truncate text-xs text-green-700">
        {truncateUrl(endpointUrl)}
      </code>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 flex-shrink-0 px-2 hover:bg-green-100"
        onClick={handleCopy}
      >
        <Copy className="h-3.5 w-3.5 text-green-600" />
      </Button>
    </div>
  );
};
