"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@tumiki/ui/button";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@tumiki/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@tumiki/ui/tabs";
import { Loader2, Clock, Globe, Timer, CalendarClock } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { AgentId } from "@/schema/ids";
import {
  type ScheduleType,
  type FrequencyValue,
  type IntervalValue,
  FREQUENCY_OPTIONS,
  INTERVAL_OPTIONS,
  HOUR_OPTIONS,
  MINUTE_OPTIONS,
  formatTime,
  getClientTimezone,
  parseCronExpression,
  buildFixedCronExpression,
  buildIntervalCronExpression,
  getFrequencyLabel,
  getIntervalLabel,
  getJstPreview,
} from "./cronUtils";

// スケジュールプレビューコンポーネント
type SchedulePreviewProps = {
  scheduleType: ScheduleType;
  frequency: FrequencyValue;
  interval: IntervalValue;
  hour: string;
  minute: string;
  clientTimezone: string;
  jstPreview: string;
};

const SchedulePreview = ({
  scheduleType,
  frequency,
  interval,
  hour,
  minute,
  clientTimezone,
  jstPreview,
}: SchedulePreviewProps) => {
  // インターバル実行の場合
  if (scheduleType === "interval") {
    return (
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="text-primary h-4 w-4" />
          <span>
            <strong>{getIntervalLabel(interval)}</strong>に実行
          </span>
        </div>
      </div>
    );
  }

  // 定時実行（日本時間）
  if (clientTimezone === "Asia/Tokyo") {
    return (
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="text-primary h-4 w-4" />
          <span>
            {getFrequencyLabel(frequency)}{" "}
            <strong>{formatTime(hour, minute)}</strong> に実行
          </span>
        </div>
      </div>
    );
  }

  // 定時実行（日本時間以外 - タイムゾーン変換表示）
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="text-primary h-4 w-4" />
        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {clientTimezone}: {formatTime(hour, minute)}
          </div>
          <div>
            日本時間: <strong>{jstPreview}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

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

export const ScheduleForm = ({
  agentId,
  isOpen,
  onClose,
  editMode = false,
  initialData,
}: ScheduleFormProps) => {
  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("fixed");
  const [frequency, setFrequency] = useState<FrequencyValue>("daily");
  const [interval, setInterval] = useState<IntervalValue>("1hour");
  const [hour, setHour] = useState("9");
  const [minute, setMinute] = useState("0");

  const clientTimezone = useMemo(() => getClientTimezone(), []);
  const utils = api.useUtils();

  // フォームをデフォルト値にリセット
  const resetToDefaults = () => {
    setName("");
    setScheduleType("fixed");
    setFrequency("daily");
    setInterval("1hour");
    setHour("9");
    setMinute("0");
  };

  // 編集データからフォームを初期化
  const initFromEditData = (data: NonNullable<typeof initialData>) => {
    setName(data.name);
    const parsed = parseCronExpression(data.cronExpression);
    setScheduleType(parsed.type);
    if (parsed.type === "fixed") {
      setFrequency(parsed.frequency ?? "daily");
      setHour(parsed.hour);
      setMinute(parsed.minute);
    } else {
      setInterval(parsed.interval ?? "1hour");
    }
  };

  useEffect(() => {
    if (editMode && initialData) {
      initFromEditData(initialData);
    } else {
      resetToDefaults();
    }
  }, [editMode, initialData, isOpen]);

  const jstPreview = useMemo(
    () => getJstPreview(hour, minute, clientTimezone),
    [hour, minute, clientTimezone],
  );

  const createMutation = api.agentSchedule.create.useMutation({
    onSuccess: () => {
      toast.success("スケジュールを作成しました");
      void utils.agentSchedule.findByAgentId.invalidate({ agentId });
      void utils.agent.findById.invalidate({ id: agentId });
      onClose();
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  const updateMutation = api.agentSchedule.update.useMutation({
    onSuccess: () => {
      toast.success("スケジュールを更新しました");
      void utils.agentSchedule.findByAgentId.invalidate({ agentId });
      void utils.agent.findById.invalidate({ id: agentId });
      onClose();
    },
    onError: (error) => {
      toast.error(`更新に失敗しました: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("スケジュール名を入力してください");
      return;
    }

    const cronExpression =
      scheduleType === "fixed"
        ? buildFixedCronExpression(frequency, hour, minute)
        : buildIntervalCronExpression(interval);

    if (editMode && initialData) {
      updateMutation.mutate({
        id: initialData.id,
        name,
        cronExpression,
        timezone: clientTimezone,
      });
    } else {
      createMutation.mutate({
        agentId,
        name,
        cronExpression,
        timezone: clientTimezone,
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

          <div className="space-y-2">
            <Label>スケジュール種別</Label>
            <Tabs
              value={scheduleType}
              onValueChange={(v) => setScheduleType(v as ScheduleType)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fixed" className="gap-2">
                  <CalendarClock className="h-4 w-4" />
                  定時実行
                </TabsTrigger>
                <TabsTrigger value="interval" className="gap-2">
                  <Timer className="h-4 w-4" />
                  インターバル
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {scheduleType === "fixed" ? (
            <>
              <div className="space-y-2">
                <Label>
                  実行頻度 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as FrequencyValue)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  実行時刻 <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Select value={hour} onValueChange={setHour}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">:</span>
                  <Select value={minute} onValueChange={setMinute}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>
                実行間隔 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={interval}
                onValueChange={(v) => setInterval(v as IntervalValue)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <SchedulePreview
            scheduleType={scheduleType}
            frequency={frequency}
            interval={interval}
            hour={hour}
            minute={minute}
            clientTimezone={clientTimezone}
            jstPreview={jstPreview}
          />
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
