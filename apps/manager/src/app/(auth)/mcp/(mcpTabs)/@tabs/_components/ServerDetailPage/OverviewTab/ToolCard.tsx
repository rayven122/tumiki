"use client";

import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight } from "lucide-react";
// import type { ToolGroupTool } from "@tumiki/db/prisma";

type ToolCardProps = {
  toolGroupTool: {
    tool: {
      id: string;
      name: string;
      description: string | null;
      inputSchema: unknown;
    };
  };
  isExpanded: boolean;
  onToggleExpansion: (toolId: string) => void;
  isEnabled: boolean;
  onToggleEnabled: (toolId: string, enabled: boolean) => void;
};

export const ToolCard = ({
  toolGroupTool,
  isExpanded,
  onToggleExpansion,
  isEnabled,
  onToggleEnabled,
}: ToolCardProps) => {
  const parseSchema = () => {
    if (!toolGroupTool.tool.inputSchema) {
      return null;
    }

    try {
      const schema =
        typeof toolGroupTool.tool.inputSchema === "string"
          ? (JSON.parse(toolGroupTool.tool.inputSchema) as Record<
              string,
              unknown
            >)
          : (toolGroupTool.tool.inputSchema as Record<string, unknown>);

      const properties = (schema.properties ?? {}) as Record<
        string,
        {
          type?: string;
          description?: string;
        }
      >;
      const required = (schema.required ?? []) as string[];

      return { properties, required };
    } catch {
      return "error";
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
      <div
        className="cursor-pointer p-4"
        onClick={() => onToggleExpansion(toolGroupTool.tool.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-1 items-start space-x-2">
            {isExpanded ? (
              <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
            ) : (
              <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-mono text-sm font-semibold text-gray-900">
                {toolGroupTool.tool.name}
              </h4>
              <p
                className={`mt-1 text-sm text-gray-600 ${!isExpanded ? "line-clamp-2" : ""}`}
              >
                {toolGroupTool.tool.description ?? "説明はありません"}
              </p>
            </div>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="ml-2 flex-shrink-0"
          >
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) =>
                onToggleEnabled(toolGroupTool.tool.id, checked)
              }
              disabled={false}
              className="data-[state=checked]:bg-green-500"
              aria-label={`${toolGroupTool.tool.name}を${isEnabled ? "無効" : "有効"}にする`}
            />
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-gray-700">パラメータ</h5>
            {(() => {
              const schemaData = parseSchema();

              if (!schemaData) {
                return (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">なし</p>
                  </div>
                );
              }

              if (schemaData === "error") {
                return (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">
                      パラメータ情報の解析に失敗しました
                    </p>
                  </div>
                );
              }

              const entries = Object.entries(schemaData.properties);
              if (entries.length === 0) {
                return (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm text-gray-500">なし</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {entries.map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-md border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm font-medium text-gray-900">
                              {key}
                            </span>
                            {schemaData.required.includes(key) && (
                              <span className="text-xs text-red-500">
                                *required
                              </span>
                            )}
                          </div>
                          {value.description && (
                            <p className="mt-1 text-sm text-gray-600">
                              {value.description}
                            </p>
                          )}
                        </div>
                        <span className="ml-4 flex-shrink-0 text-sm text-gray-500">
                          {value.type ?? "any"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
