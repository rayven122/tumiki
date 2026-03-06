"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@tumiki/ui/popover";
import { Switch } from "@tumiki/ui/switch";
import { AlertCircle, Bell, Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@tumiki/ui/button";

/**
 * Slack通知設定の値を表す型
 */
export type SlackNotificationSettingsValue = {
  enableSlackNotification: boolean;
  slackNotificationChannelId: string;
  slackNotificationChannelName: string;
  notifyOnlyOnFailure: boolean;
};

/**
 * Slackチャンネル情報
 */
export type SlackChannel = {
  id: string;
  name: string;
};

type SlackNotificationSettingsProps = {
  /** 現在の設定値 */
  value: SlackNotificationSettingsValue;
  /** 設定値が変更されたときのコールバック */
  onChange: (updates: Partial<SlackNotificationSettingsValue>) => void;
  /** Slack連携が有効かどうか（未設定時はfalse） */
  isSlackConnected?: boolean;
  /** 利用可能なSlackチャンネル一覧（Slack連携時に渡す） */
  channels?: SlackChannel[];
};

/**
 * 検索可能なSlackチャンネルセレクタ
 */
const SlackChannelSelector = ({
  channels,
  value,
  onSelect,
}: {
  channels: SlackChannel[];
  value: string;
  onSelect: (channelId: string, channelName: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // チャンネルをアルファベット順にソートし、検索でフィルタリング
  const filteredChannels = useMemo(() => {
    const sorted = [...channels].sort((a, b) =>
      a.name.localeCompare(b.name, "ja"),
    );

    if (!searchQuery.trim()) {
      return sorted;
    }

    const query = searchQuery.toLowerCase();
    return sorted.filter((channel) =>
      channel.name.toLowerCase().includes(query),
    );
  }, [channels, searchQuery]);

  // 選択されているチャンネル名を取得
  const selectedChannel = channels.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedChannel ? `#${selectedChannel.name}` : "チャンネルを選択"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0">
        {/* 検索入力 */}
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="チャンネルを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* チャンネル一覧 */}
        <div className="max-h-[200px] overflow-y-auto p-1">
          {filteredChannels.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              チャンネルが見つかりません
            </div>
          ) : (
            filteredChannels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => {
                  onSelect(channel.id, channel.name);
                  setOpen(false);
                  setSearchQuery("");
                }}
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                  value === channel.id && "bg-accent",
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === channel.id ? "opacity-100" : "opacity-0",
                  )}
                />
                #{channel.name}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

/**
 * Slack通知設定のフォームコンポーネント
 * エージェント作成・編集フォームで共通利用
 */
export const SlackNotificationSettings = ({
  value,
  onChange,
  isSlackConnected = false,
  channels,
}: SlackNotificationSettingsProps) => {
  // チャンネル一覧が渡されている場合はセレクトボックスを使用
  const hasChannels = channels && channels.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-purple-600" />
          Slack通知設定
        </CardTitle>
        <p className="text-sm text-gray-600">
          エージェント実行完了時にSlackへ通知を送信（任意）
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Slack連携が無効の場合の警告 */}
        {!isSlackConnected && (
          <div className="flex items-start gap-3 rounded-md bg-amber-50 p-3 text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Slack連携が必要です</p>
              <p className="text-xs">
                Slack通知を使用するには、設定でSlackワークスペースと連携してください。
              </p>
            </div>
          </div>
        )}

        {/* 通知有効化トグル */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label
              htmlFor="enableSlackNotification"
              className={isSlackConnected ? undefined : "text-gray-400"}
            >
              Slack通知を有効化
            </Label>
            <p className="text-xs text-gray-500">
              エージェント実行完了時に通知を送信します
            </p>
          </div>
          <Switch
            id="enableSlackNotification"
            checked={value.enableSlackNotification}
            onCheckedChange={(checked) =>
              onChange({ enableSlackNotification: checked })
            }
            disabled={!isSlackConnected}
          />
        </div>

        {/* 通知設定の詳細（有効時のみ表示） */}
        {value.enableSlackNotification && isSlackConnected && (
          <div className="space-y-4 border-t pt-4">
            {/* チャンネル選択 */}
            <div className="space-y-2">
              <Label htmlFor="slackNotificationChannelId">
                通知先チャンネル <span className="text-red-500">*</span>
              </Label>
              {hasChannels ? (
                <SlackChannelSelector
                  channels={channels}
                  value={value.slackNotificationChannelId || ""}
                  onSelect={(channelId, channelName) =>
                    onChange({
                      slackNotificationChannelId: channelId,
                      slackNotificationChannelName: channelName,
                    })
                  }
                />
              ) : (
                <Input
                  id="slackNotificationChannelId"
                  placeholder="例: C1234567890"
                  value={value.slackNotificationChannelId}
                  onChange={(e) =>
                    onChange({
                      slackNotificationChannelId: e.target.value,
                    })
                  }
                />
              )}
              <p className="text-xs text-gray-500">
                {hasChannels
                  ? "通知を送信するSlackチャンネルを選択してください"
                  : "SlackチャンネルのIDを入力（Cで始まる英数字）"}
              </p>
            </div>

            {/* 失敗時のみ通知 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="notifyOnlyOnFailure"
                checked={value.notifyOnlyOnFailure}
                onCheckedChange={(checked) =>
                  onChange({ notifyOnlyOnFailure: checked })
                }
              />
              <Label htmlFor="notifyOnlyOnFailure" className="cursor-pointer">
                失敗時のみ通知
              </Label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
