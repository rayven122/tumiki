"use client";

import JsonView from "@uiw/react-json-view";
import { FileText } from "lucide-react";

type JsonViewerProps = {
  data: unknown;
  collapsed?: number;
  maxHeight?: string;
};

export const JsonViewer = ({
  data,
  collapsed = 2,
  maxHeight = "700px",
}: JsonViewerProps) => {
  if (!data) {
    return (
      <div className="text-muted-foreground flex items-center justify-center p-8">
        <FileText className="mr-2 h-6 w-6" />
        <span>データがありません</span>
      </div>
    );
  }

  // データ型を確認してJSONオブジェクトに変換
  let jsonData = data;

  // stringの場合は再度JSONパースを試行
  if (typeof data === "string") {
    try {
      jsonData = JSON.parse(data) as object;
    } catch {
      // パースに失敗した場合はそのまま表示
    }
  }

  // フォールバック表示の実装
  try {
    return (
      <div className={`overflow-auto`} style={{ maxHeight }}>
        <JsonView
          value={jsonData}
          collapsed={collapsed}
          style={{
            fontSize: "12px",
            fontFamily: "monospace",
          }}
        />
      </div>
    );
  } catch {
    // フォールバック表示：プリフォーマットされたテキスト
    const displayText =
      typeof jsonData === "string"
        ? jsonData
        : JSON.stringify(jsonData, null, 2);

    return (
      <div className={`overflow-auto`} style={{ maxHeight }}>
        <div className="rounded border bg-gray-50 p-4">
          <div className="mb-2 text-sm text-gray-600">
            JSON表示に失敗しました。以下はプレーンテキスト表示です：
          </div>
          <pre className="font-mono text-xs break-words whitespace-pre-wrap">
            {displayText}
          </pre>
        </div>
      </div>
    );
  }
};
