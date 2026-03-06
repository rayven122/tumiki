import { Info } from "lucide-react";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { normalizeServerName } from "@tumiki/shared/utils/normalizeServerName";

type ServerNameInputProps = {
  serverName: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

export const ServerNameInput = ({
  serverName,
  placeholder,
  disabled,
  onChange,
}: ServerNameInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="server-name" className="text-sm font-medium">
        サーバー名
      </Label>
      <Input
        id="server-name"
        type="text"
        placeholder={placeholder}
        value={serverName}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm"
        disabled={disabled}
      />
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs">
          表示されるサーバー名を設定できます（空白や大文字を含むことができます）
        </p>
        {serverName && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="bg-muted flex w-full items-center gap-1.5 rounded px-3 py-2 transition-colors hover:bg-gray-200"
                >
                  <span className="text-muted-foreground text-xs font-medium">
                    MCPサーバー識別子:
                  </span>
                  <span className="font-mono text-xs text-gray-700">
                    {normalizeServerName(serverName)}
                  </span>
                  <Info className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                className="max-w-sm border-gray-700 bg-gray-900"
              >
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-white">
                    MCPサーバー識別子の用途
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-xs text-gray-300">
                    <li>
                      ツール名の接頭辞として使用（例:
                      {normalizeServerName(serverName)}__tool_name）
                    </li>
                    <li>
                      設定ファイルのキーとして使用（Claude Desktop、Cursor等）
                    </li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
};
