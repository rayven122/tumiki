"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { AgentId } from "@/schema/ids";

type ScheduleFormProps = {
  agentId: AgentId;
  isOpen: boolean;
  onClose: () => void;
  editMode?: boolean;
  initialData?: {
    id: string;
    name: string;
    cronExpression: string;
    timezone: string;
  };
};

// プリセットのCron式
const CRON_PRESETS = [
  { label: "毎日 9:00", value: "0 9 * * *" },
  { label: "毎日 18:00", value: "0 18 * * *" },
  { label: "平日 9:00", value: "0 9 * * 1-5" },
  { label: "毎週月曜 9:00", value: "0 9 * * 1" },
  { label: "毎月1日 9:00", value: "0 9 1 * *" },
  { label: "カスタム", value: "custom" },
];

// タイムゾーン選択肢
const TIMEZONE_OPTIONS = [
  { label: "日本標準時 (JST)", value: "Asia/Tokyo" },
  { label: "協定世界時 (UTC)", value: "UTC" },
  { label: "太平洋標準時 (PST)", value: "America/Los_Angeles" },
  { label: "東部標準時 (EST)", value: "America/New_York" },
];

export const ScheduleForm = ({
  agentId,
  isOpen,
  onClose,
  editMode = false,
  initialData,
}: ScheduleFormProps) => {
  const [name, setName] = useState("");
  const [cronPreset, setCronPreset] = useState("0 9 * * *");
  const [customCron, setCustomCron] = useState("");
  const [timezone, setTimezone] = useState("Asia/Tokyo");

  const utils = api.useUtils();

  // 編集モード時の初期値設定
  useEffect(() => {
    if (editMode && initialData) {
      setName(initialData.name);
      setTimezone(initialData.timezone);
      // プリセットに一致するか確認
      const matchingPreset = CRON_PRESETS.find(
        (p) => p.value === initialData.cronExpression,
      );
      if (matchingPreset) {
        setCronPreset(initialData.cronExpression);
        setCustomCron("");
      } else {
        setCronPreset("custom");
        setCustomCron(initialData.cronExpression);
      }
    } else {
      // 新規作成時はリセット
      setName("");
      setCronPreset("0 9 * * *");
      setCustomCron("");
      setTimezone("Asia/Tokyo");
    }
  }, [editMode, initialData, isOpen]);

  // 作成ミューテーション
  const createMutation = api.v2.agentSchedule.create.useMutation({
    onSuccess: () => {
      toast.success("スケジュールを作成しました");
      void utils.v2.agentSchedule.findByAgentId.invalidate({ agentId });
      onClose();
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  // 更新ミューテーション
  const updateMutation = api.v2.agentSchedule.update.useMutation({
    onSuccess: () => {
      toast.success("スケジュールを更新しました");
      void utils.v2.agentSchedule.findByAgentId.invalidate({ agentId });
      onClose();
    },
    onError: (error) => {
      toast.error(`更新に失敗しました: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    const cronExpression = cronPreset === "custom" ? customCron : cronPreset;

    if (!name.trim()) {
      toast.error("スケジュール名を入力してください");
      return;
    }

    if (!cronExpression.trim()) {
      toast.error("Cron式を入力してください");
      return;
    }

    if (editMode && initialData) {
      updateMutation.mutate({
        id: initialData.id,
        name,
        cronExpression,
        timezone,
      });
    } else {
      createMutation.mutate({
        agentId,
        name,
        cronExpression,
        timezone,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editMode ? "スケジュールを編集" : "新規スケジュール"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* スケジュール名 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              スケジュール名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="例: 毎日9時のレポート"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* 実行タイミング */}
          <div className="space-y-2">
            <Label>
              実行タイミング <span className="text-red-500">*</span>
            </Label>
            <Select value={cronPreset} onValueChange={setCronPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRON_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {cronPreset === "custom" && (
              <div className="space-y-2">
                <Input
                  placeholder="0 9 * * *"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  形式: 分 時 日 月 曜日（0=日曜）
                </p>
              </div>
            )}
          </div>

          {/* タイムゾーン */}
          <div className="space-y-2">
            <Label>タイムゾーン</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editMode ? "更新" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
