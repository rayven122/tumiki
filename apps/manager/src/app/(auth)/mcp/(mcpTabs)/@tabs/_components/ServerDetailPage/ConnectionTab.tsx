"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Code, Server } from "lucide-react";
import { useState } from "react";
import type { UserMcpServerInstance } from "./types";
import { CopyableText } from "./CopyableText";

type ConnectionTabProps = {
  instance: UserMcpServerInstance;
  toKebabCase: (str: string) => string;
};

export const ConnectionTab = ({
  instance,
  toKebabCase,
}: ConnectionTabProps) => {
  const [collapsedSections, setCollapsedSections] = useState({
    claude: true,
    claudeCode: true,
    http: true,
  });

  const apiKey = instance.apiKeys[0]?.apiKey;

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">接続設定</h2>
      </div>

      <div className="grid w-full gap-6">
        {/* Claude Desktop */}
        <Card className="w-full">
          <CardHeader>
            <Collapsible
              open={!collapsedSections.claude}
              onOpenChange={() => toggleSection("claude")}
            >
              <CollapsibleTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                      <Code className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle>Claude Desktop</CardTitle>
                      <p className="text-sm text-gray-600">
                        claude_desktop_config.json に追加
                      </p>
                    </div>
                  </div>
                  {collapsedSections.claude ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-4">
                  <div className="w-full space-y-3 overflow-hidden">
                    <CopyableText
                      text={`{
  "mcpServers": {
    "${toKebabCase(instance.name)}": {
      "url": "https://server.tumiki.cloud/sse?api-key=${apiKey}"
    }
  }
}`}
                      label="Claude Desktop 設定"
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
        </Card>

        {/* Claude Code */}
        <Card className="w-full">
          <CardHeader>
            <Collapsible
              open={!collapsedSections.claudeCode}
              onOpenChange={() => toggleSection("claudeCode")}
            >
              <CollapsibleTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                      <Code className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Claude Code</CardTitle>
                      <p className="text-sm text-gray-600">
                        claude mcp add コマンド
                      </p>
                    </div>
                  </div>
                  {collapsedSections.claudeCode ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-4">
                  <div className="w-full space-y-4 overflow-hidden">
                    <CopyableText
                      text={`claude mcp add --transport sse ${toKebabCase(instance.name)} https://server.tumiki.cloud/sse --header "api-key: ${apiKey}"`}
                      label="SSE"
                      className="w-full"
                    />

                    <CopyableText
                      text={`claude mcp add --transport http ${toKebabCase(instance.name)} https://server.tumiki.cloud/mcp --header "api-key: ${apiKey}"`}
                      label="Streamable HTTP"
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
        </Card>

        {/* HTTP API */}
        <Card className="w-full">
          <CardHeader>
            <Collapsible
              open={!collapsedSections.http}
              onOpenChange={() => toggleSection("http")}
            >
              <CollapsibleTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                      <Server className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle>HTTP API</CardTitle>
                      <p className="text-sm text-gray-600">直接HTTP接続用</p>
                    </div>
                  </div>
                  {collapsedSections.http ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-4">
                  <div className="w-full space-y-3 overflow-hidden">
                    <CopyableText
                      text={`https://server.tumiki.cloud/sse?api-key=${apiKey}`}
                      label="SSE"
                      variant="input"
                      className="w-full"
                    />

                    <CopyableText
                      text={`https://server.tumiki.cloud/mcp?api-key=${apiKey}`}
                      label="Streamable HTTP"
                      variant="input"
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};
