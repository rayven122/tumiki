"use client";

import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * 部署に使用可能なアイコン候補
 */
export const DEPARTMENT_ICONS = [
  // 一般的な部署
  { name: "Building2", label: "ビル" },
  { name: "Users", label: "チーム" },
  { name: "Briefcase", label: "ビジネス" },
  { name: "FolderKanban", label: "プロジェクト" },
  // 技術・開発
  { name: "Code", label: "開発" },
  { name: "Monitor", label: "IT" },
  { name: "Server", label: "インフラ" },
  { name: "Database", label: "データ" },
  { name: "Cpu", label: "システム" },
  { name: "Globe", label: "Web" },
  // 営業・マーケティング
  { name: "TrendingUp", label: "営業" },
  { name: "Target", label: "目標" },
  { name: "Megaphone", label: "マーケ" },
  { name: "BarChart3", label: "分析" },
  { name: "PieChart", label: "統計" },
  // 管理・サポート
  { name: "Settings", label: "管理" },
  { name: "Shield", label: "セキュリティ" },
  { name: "HeadphonesIcon", label: "サポート" },
  { name: "MessageSquare", label: "コミュニケーション" },
  { name: "FileText", label: "ドキュメント" },
  // 人事・総務
  { name: "UserPlus", label: "採用" },
  { name: "GraduationCap", label: "教育" },
  { name: "Heart", label: "福利厚生" },
  { name: "Banknote", label: "経理" },
  { name: "Scale", label: "法務" },
  // クリエイティブ
  { name: "Palette", label: "デザイン" },
  { name: "PenTool", label: "クリエイティブ" },
  { name: "Camera", label: "メディア" },
  { name: "Video", label: "映像" },
  { name: "Music", label: "音楽" },
  // その他
  { name: "Rocket", label: "新規事業" },
  { name: "Lightbulb", label: "企画" },
  { name: "Wrench", label: "運用" },
  { name: "Package", label: "物流" },
  { name: "Factory", label: "製造" },
] as const;

export type DepartmentIconName = (typeof DEPARTMENT_ICONS)[number]["name"];

type IconPickerProps = {
  selectedIcon: string | undefined;
  onIconChange: (iconName: string) => void;
  disabled?: boolean;
};

export const IconPicker = ({
  selectedIcon,
  onIconChange,
  disabled,
}: IconPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // 選択されたアイコンコンポーネントを取得
  const SelectedIconComponent = selectedIcon
    ? (LucideIcons[
        selectedIcon as keyof typeof LucideIcons
      ] as React.ComponentType<{ className?: string }>)
    : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 p-0"
          disabled={disabled}
        >
          {SelectedIconComponent ? (
            <SelectedIconComponent className="h-5 w-5" />
          ) : (
            <LucideIcons.ImageIcon className="text-muted-foreground h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="mb-2 text-sm font-medium">アイコンを選択</div>
        <div className="grid grid-cols-6 gap-1.5">
          {DEPARTMENT_ICONS.map(({ name, label }) => {
            const IconComponent = LucideIcons[
              name as keyof typeof LucideIcons
            ] as React.ComponentType<{ className?: string }>;
            const isSelected = selectedIcon === name;

            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onIconChange(name);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted border-transparent",
                )}
                title={label}
              >
                <IconComponent className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
