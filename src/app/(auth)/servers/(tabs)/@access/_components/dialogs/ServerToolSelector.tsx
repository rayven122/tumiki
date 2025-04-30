import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Server } from "lucide-react";
import Image from "next/image";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Prisma } from "@prisma/client";
import { ToolBadgeList } from "../ToolBadgeList";

type UserMcpServer = Prisma.UserMcpServerGetPayload<{
  include: {
    tools: true;
    mcpServer: true;
  };
}>;

type ServerToolSelectorProps = {
  servers: UserMcpServer[];
  selectedServerIds: Set<string>;
  selectedToolIds: Set<string>;
  onServersChange: (servers: Set<string>) => void;
  onToolsChange: (tools: Set<string>) => void;
};

export function ServerToolSelector({
  servers,
  selectedServerIds,
  selectedToolIds,
  onServersChange,
  onToolsChange,
}: ServerToolSelectorProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // サーバーのツール選択状態を更新
  const handleServerToolsUpdate = (
    server: Pick<UserMcpServer, "tools">,
    checked: boolean,
  ) => {
    const newSelectedTools = new Set(selectedToolIds);
    const serverTools = new Set(server.tools.map((tool) => tool.id));

    if (checked) {
      // このサーバーのツールを追加
      serverTools.forEach((toolId) => {
        newSelectedTools.add(toolId);
      });
    } else {
      // このサーバーのツールをすべて削除
      serverTools.forEach((toolId) => {
        newSelectedTools.delete(toolId);
      });
    }
    onToolsChange(newSelectedTools);
  };

  // サーバーのチェックボックス変更を処理
  const handleServerCheckChange = (
    server: Pick<UserMcpServer, "id" | "tools">,
    checked: boolean,
  ) => {
    // 選択されたサーバーを更新
    const newSelectedServers = new Set(selectedServerIds);
    if (checked) {
      newSelectedServers.add(server.id);
    } else {
      newSelectedServers.delete(server.id);
    }
    onServersChange(newSelectedServers);

    // ツールの選択状態を更新
    handleServerToolsUpdate(server, checked);

    // サーバーをチェックしたときにアコーディオンを自動展開
    if (checked && !expandedItems.includes(server.id)) {
      setExpandedItems([...expandedItems, server.id]);
    }
  };

  // ツールのチェックボックス変更を処理
  const handleToolCheckChange = (toolId: string, checked: boolean) => {
    const newSelectedTools = new Set(selectedToolIds);
    if (checked) {
      newSelectedTools.add(toolId);
    } else {
      newSelectedTools.delete(toolId);
    }
    onToolsChange(newSelectedTools);
  };

  // 選択されたすべてのツールをオブジェクトとして取得
  const getSelectedTools = () => {
    const tools: { id: string; name: string; userMcpServerName: string }[] = [];

    servers.forEach((server) => {
      server.tools.forEach((tool) => {
        if (selectedToolIds.has(tool.id)) {
          tools.push({
            id: tool.id,
            name: tool.name,
            userMcpServerName: server.name ?? server.mcpServer.name,
          });
        }
      });
    });

    return tools;
  };

  return (
    <>
      <div className="grid gap-2">
        <Label>接続サーバーとツール</Label>
        <div className="max-h-60 overflow-y-auto rounded-md border p-2">
          <Accordion
            type="multiple"
            value={expandedItems}
            onValueChange={setExpandedItems}
            className="w-full"
          >
            {servers.map((server) => (
              <AccordionItem
                key={server.id}
                value={server.id}
                className="border-b"
              >
                <div className="flex items-center px-1 py-2">
                  <Checkbox
                    id={`server-${server.id}`}
                    checked={selectedServerIds.has(server.id)}
                    onCheckedChange={(checked) => {
                      if (checked === "indeterminate") return;
                      handleServerCheckChange(server, checked);
                    }}
                    className="mr-2"
                  />
                  <AccordionTrigger className="flex-1 py-0 hover:no-underline">
                    <Label
                      htmlFor={`server-${server.id}`}
                      className="flex flex-1 cursor-pointer items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100">
                        {server.mcpServer.iconPath ? (
                          <Image
                            src={server.mcpServer.iconPath}
                            alt={server.name ?? server.mcpServer.name}
                            width={16}
                            height={16}
                          />
                        ) : (
                          <Server className="h-3 w-3 text-slate-500" />
                        )}
                      </div>
                      <span>{server.name}</span>
                    </Label>
                  </AccordionTrigger>
                </div>
                <AccordionContent className="pr-2 pl-8">
                  <div className="space-y-1">
                    {server.tools.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center space-x-2 py-1"
                      >
                        <Checkbox
                          id={`tool-${tool.id}`}
                          checked={selectedToolIds.has(tool.id)}
                          onCheckedChange={(checked) => {
                            if (checked === "indeterminate") return;
                            handleToolCheckChange(tool.id, checked);
                          }}
                          disabled={selectedServerIds.has(server.id)}
                        />
                        <Label
                          htmlFor={`tool-${tool.id}`}
                          className="cursor-pointer text-sm"
                        >
                          {tool.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
      <div className="mt-4">
        {selectedToolIds.size > 0 && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">
              選択されたツール ({selectedToolIds.size}個):
            </p>
            <ToolBadgeList tools={getSelectedTools()} />
          </div>
        )}
      </div>
    </>
  );
}
