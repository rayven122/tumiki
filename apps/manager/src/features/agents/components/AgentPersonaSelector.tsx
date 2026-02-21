"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import { cn } from "@/lib/utils";
import { api } from "~/trpc/react";

type AgentPersonaSelectorProps = {
  selectedPersonaId?: string;
  onPersonaChange: (id: string | undefined) => void;
  className?: string;
};

const DEFAULT_ICON = "🤖";

// キャラクターなしの選択肢用の値（SelectItemのvalueは空文字不可）
const NONE_VALUE = "__none__";

// アイコンが画像パスか絵文字かを判定
const isImagePath = (icon: string) => icon.startsWith("/");

// ペルソナアイコンを描画（Radix Select内での互換性のため<img>を使用）
const PersonaIcon = ({
  icon,
  size = 20,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) => {
  if (isImagePath(icon)) {
    return (
      <img
        src={icon}
        alt=""
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return <span className={cn("leading-none", className)}>{icon}</span>;
};

export const AgentPersonaSelector = ({
  selectedPersonaId,
  onPersonaChange,
  className,
}: AgentPersonaSelectorProps) => {
  const { data: personas } = api.chat.listPersonas.useQuery();

  if (!personas || personas.length === 0) {
    return null;
  }

  // 現在選択中のペルソナ情報
  const currentPersona = selectedPersonaId
    ? personas.find((p) => p.id === selectedPersonaId)
    : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        value={selectedPersonaId ?? NONE_VALUE}
        onValueChange={(value) => {
          onPersonaChange(value === NONE_VALUE ? undefined : value);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="キャラクターを選択">
            {currentPersona ? (
              <span className="flex items-center gap-2">
                <PersonaIcon
                  icon={currentPersona.icon ?? DEFAULT_ICON}
                  size={18}
                />
                <span>{currentPersona.name}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">キャラクターなし</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>
            <span className="text-muted-foreground">キャラクターなし</span>
          </SelectItem>
          {personas.map((persona) => (
            <SelectItem key={persona.id} value={persona.id}>
              <span className="flex items-center gap-2">
                <PersonaIcon
                  icon={persona.icon ?? DEFAULT_ICON}
                  size={18}
                  className="shrink-0"
                />
                <span>{persona.name}</span>
                <span className="text-muted-foreground text-xs">
                  - {persona.description}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentPersona && (
        <div className="flex items-start gap-3 rounded-md border border-purple-100 bg-purple-50 p-3">
          <PersonaIcon
            icon={currentPersona.icon ?? DEFAULT_ICON}
            size={28}
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-medium text-purple-900">
              {currentPersona.name}
            </div>
            <div className="text-xs text-purple-700">
              {currentPersona.description}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
