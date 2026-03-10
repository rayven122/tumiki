"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { api } from "@/trpc/react";
import { EntityIcon } from "@/features/shared/components/EntityIcon";
import type { ScheduleRange } from "@/features/dashboard/api/schemas";

type ScheduleTimelineItem = {
  scheduleId: string;
  scheduleName: string;
  agentName: string;
  agentSlug: string;
  agentIconPath: string | null;
  cronExpression: string;
  nextRunAt: Date;
};

const SCHEDULE_RANGE_LABELS: Record<ScheduleRange, string> = {
  today: "今日",
  week: "今週",
};

export const ScheduleTimeline = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [range, setRange] = useState<ScheduleRange>("today");

  const { data, isLoading } = api.dashboard.getScheduleTimeline.useQuery({
    range,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          スケジュール
          <div className="ml-auto">
            <Select
              value={range}
              onValueChange={(value) => setRange(value as ScheduleRange)}
            >
              <SelectTrigger className="h-7 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCHEDULE_RANGE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        {isLoading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : !data?.items.length ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            スケジュールがありません
          </p>
        ) : (
          (data.items as ScheduleTimelineItem[]).map((item, index) => (
            <Link
              key={`${item.scheduleId}-${index}`}
              href={`/${orgSlug}/agents/${item.agentSlug}`}
              className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-all duration-150"
            >
              <div className="text-muted-foreground flex w-12 shrink-0 items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs font-medium">
                  {format(new Date(item.nextRunAt), "HH:mm", { locale: ja })}
                </span>
              </div>
              <EntityIcon
                iconPath={item.agentIconPath}
                type="agent"
                size="sm"
                alt={item.agentName}
              />
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">
                  {item.agentName}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {item.scheduleName}
                </p>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
};
