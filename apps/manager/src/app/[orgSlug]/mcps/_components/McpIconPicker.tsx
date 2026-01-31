"use client";

import { useState, type ComponentType, type CSSProperties } from "react";
import {
  Bot,
  Brain,
  Sparkles,
  Code,
  Terminal,
  Server,
  Database,
  Globe,
  Github,
  Cpu,
  MessageSquare,
  Mail,
  Bell,
  FileText,
  FolderOpen,
  Cloud,
  HardDrive,
  Search,
  Calendar,
  Image,
  Video,
  Music,
  Wrench,
  Puzzle,
  Zap,
  Shield,
  Lock,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// アイコンコンポーネントの型
type IconComponentType = ComponentType<{
  className?: string;
  style?: CSSProperties;
}>;

// 事前定義されたアイコンマップ（バンドルサイズ最適化）
const ICON_MAP: Record<string, IconComponentType> = {
  Bot,
  Brain,
  Sparkles,
  Code,
  Terminal,
  Server,
  Database,
  Globe,
  Github,
  Cpu,
  MessageSquare,
  Mail,
  Bell,
  FileText,
  FolderOpen,
  Cloud,
  HardDrive,
  Search,
  Calendar,
  Image,
  Video,
  Music,
  Wrench,
  Puzzle,
  Zap,
  Shield,
  Lock,
  BarChart3,
  TrendingUp,
};

/**
 * MCPサーバー用のアイコン候補
 */
export const MCP_SERVER_ICONS = [
  // AI・LLM
  { name: "Bot", label: "AI" },
  { name: "Brain", label: "LLM" },
  { name: "Sparkles", label: "生成AI" },
  // 開発・技術
  { name: "Code", label: "コード" },
  { name: "Terminal", label: "ターミナル" },
  { name: "Server", label: "サーバー" },
  { name: "Database", label: "データベース" },
  { name: "Globe", label: "Web" },
  { name: "Github", label: "GitHub" },
  { name: "Cpu", label: "システム" },
  // コミュニケーション
  { name: "MessageSquare", label: "チャット" },
  { name: "Mail", label: "メール" },
  { name: "Bell", label: "通知" },
  // ファイル・ストレージ
  { name: "FileText", label: "ドキュメント" },
  { name: "FolderOpen", label: "フォルダ" },
  { name: "Cloud", label: "クラウド" },
  { name: "HardDrive", label: "ストレージ" },
  // その他ツール
  { name: "Search", label: "検索" },
  { name: "Calendar", label: "カレンダー" },
  { name: "Image", label: "画像" },
  { name: "Video", label: "動画" },
  { name: "Music", label: "音楽" },
  { name: "Wrench", label: "ツール" },
  { name: "Puzzle", label: "プラグイン" },
  { name: "Zap", label: "自動化" },
  { name: "Shield", label: "セキュリティ" },
  { name: "Lock", label: "認証" },
  // ビジネス
  { name: "BarChart3", label: "分析" },
  { name: "TrendingUp", label: "トレンド" },
] as const;

export type McpServerIconName = (typeof MCP_SERVER_ICONS)[number]["name"];

/**
 * アイコン名からコンポーネントを取得
 */
export const getIconComponent = (name: string): IconComponentType | null => {
  return ICON_MAP[name] ?? null;
};

type McpIconPickerProps = {
  selectedIcon: string | null;
  onIconSelect: (iconName: string) => void;
};

/**
 * MCPサーバー用のアイコン選択グリッド
 */
export const McpIconPicker = ({
  selectedIcon,
  onIconSelect,
}: McpIconPickerProps) => {
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">プリセットアイコン</div>
      <div className="grid grid-cols-6 gap-2">
        {MCP_SERVER_ICONS.map(({ name, label }) => {
          const IconComponent = ICON_MAP[name];
          const isSelected = selectedIcon === `lucide:${name}`;

          if (!IconComponent) return null;

          return (
            <button
              key={name}
              type="button"
              onClick={() => onIconSelect(`lucide:${name}`)}
              onMouseEnter={() => setHoveredIcon(name)}
              onMouseLeave={() => setHoveredIcon(null)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border transition-all",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:bg-muted border-transparent hover:border-gray-200",
              )}
              title={label}
            >
              <IconComponent className="h-5 w-5" />
            </button>
          );
        })}
      </div>
      {/* ホバー時にラベルを表示 */}
      <div className="text-muted-foreground h-4 text-center text-xs">
        {hoveredIcon
          ? MCP_SERVER_ICONS.find((i) => i.name === hoveredIcon)?.label
          : "アイコンを選択してください"}
      </div>
    </div>
  );
};
