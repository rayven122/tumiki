"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Loader2, Clock, Globe } from "lucide-react";
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

const FREQUENCY_OPTIONS = [
  { label: "毎日", value: "daily", cron: "* * *" },
  { label: "平日（月〜金）", value: "weekdays", cron: "* * 1-5" },
  { label: "土日", value: "weekends", cron: "* * 0,6" },
  { label: "毎週月曜", value: "monday", cron: "* * 1" },
  { label: "毎週金曜", value: "friday", cron: "* * 5" },
  { label: "毎月1日", value: "monthly", cron: "1 * *" },
] as const;

type FrequencyValue = (typeof FREQUENCY_OPTIONS)[number]["value"];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  label: `${i.toString().padStart(2, "0")}時`,
  value: i.toString(),
}));

const MINUTE_OPTIONS = [
  { label: "00分", value: "0" },
  { label: "15分", value: "15" },
  { label: "30分", value: "30" },
  { label: "45分", value: "45" },
];

const padTime = (value: string): string => value.padStart(2, "0");

const formatTime = (hour: string, minute: string): string =>
  `${padTime(hour)}:${padTime(minute)}`;

const getClientTimezone = (): string => {
  if (typeof window === "undefined") return "Asia/Tokyo";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Asia/Tokyo";
  }
};

const parseCronExpression = (
  cron: string,
): { frequency: FrequencyValue; hour: string; minute: string } => {
  const parts = cron.split(" ");
  if (parts.length !== 5) {
    return { frequency: "daily", hour: "9", minute: "0" };
  }

  const [minute, hour, day, , dayOfWeek] = parts;
  const cronSuffix = `${day} * ${dayOfWeek}`;

  const matchedOption = FREQUENCY_OPTIONS.find(
    (opt) => opt.cron === cronSuffix,
  );
  const frequency = matchedOption?.value ?? "daily";

  return {
    frequency,
    hour: hour ?? "9",
    minute: minute ?? "0",
  };
};

const buildCronExpression = (
  frequency: FrequencyValue,
  hour: string,
  minute: string,
): string => {
  const frequencyOption = FREQUENCY_OPTIONS.find((f) => f.value === frequency);
  const cronSuffix = frequencyOption?.cron ?? "* * *";
  return `${minute} ${hour} ${cronSuffix}`;
};

const getJstPreview = (
  hour: string,
  minute: string,
  clientTimezone: string,
): string => {
  const fallback = formatTime(hour, minute);
  if (clientTimezone === "Asia/Tokyo") {
    return fallback;
  }

  try {
    const now = new Date();
    now.setHours(Number(hour), Number(minute), 0, 0);

    return now.toLocaleTimeString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return fallback;
  }
};

const getFrequencyLabel = (frequency: FrequencyValue): string =>
  FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label ?? "毎日";

export const ScheduleForm = ({
  agentId,
  isOpen,
  onClose,
  editMode = false,
  initialData,
}: ScheduleFormProps) => {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<FrequencyValue>("daily");
  const [hour, setHour] = useState("9");
  const [minute, setMinute] = useState("0");

  const clientTimezone = useMemo(() => getClientTimezone(), []);

  const utils = api.useUtils();

  useEffect(() => {
    if (editMode && initialData) {
      setName(initialData.name);
      const parsed = parseCronExpression(initialData.cronExpression);
      setFrequency(parsed.frequency);
      setHour(parsed.hour);
      setMinute(parsed.minute);
    } else {
      setName("");
      setFrequency("daily");
      setHour("9");
      setMinute("0");
    }
  }, [editMode, initialData, isOpen]);

  const jstPreview = useMemo(
    () => getJstPreview(hour, minute, clientTimezone),
    [hour, minute, clientTimezone],
  );

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
    if (!name.trim()) {
      toast.error("スケジュール名を入力してください");
      return;
    }

    const cronExpression = buildCronExpression(frequency, hour, minute);

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

          <div className="bg-muted/50 space-y-2 rounded-lg p-3">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4" />
              <span>タイムゾーン: {clientTimezone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="text-primary h-4 w-4" />
              <span>
                日本時間: <strong>{jstPreview}</strong>（
                {getFrequencyLabel(frequency)}）
              </span>
            </div>
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
