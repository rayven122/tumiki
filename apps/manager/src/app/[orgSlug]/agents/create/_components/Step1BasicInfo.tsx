"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAgentFlow } from "@/atoms/agentFlowAtoms";
import { McpServerVisibility } from "@tumiki/db/prisma";

// モデル選択肢
const MODEL_OPTIONS = [
  { value: "", label: "デフォルト（Claude 3.5 Sonnet）" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku（高速）" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus（高性能）" },
];

// 可視性選択肢
const VISIBILITY_OPTIONS = [
  {
    value: McpServerVisibility.PRIVATE,
    label: "自分のみ",
    description: "作成者のみが使用可能",
  },
  {
    value: McpServerVisibility.ORGANIZATION,
    label: "組織内",
    description: "組織メンバー全員が使用可能",
  },
];

/**
 * ステップ1: 基本情報入力
 */
export const Step1BasicInfo = () => {
  const { flowState, updateFlowState, nextStep, isBasicInfoValid } =
    useAgentFlow();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            基本情報を入力
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* エージェント名 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              エージェント名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="例: 議事録作成アシスタント"
              value={flowState.name}
              onChange={(e) => updateFlowState({ name: e.target.value })}
              maxLength={50}
            />
            <p className="text-xs text-gray-500">
              わかりやすい名前をつけてください（最大50文字）
            </p>
          </div>

          {/* システムプロンプト */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">
              システムプロンプト <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="systemPrompt"
              placeholder="例: あなたは議事録作成の専門家です。会議の内容を整理し、重要なポイントをまとめてください。"
              value={flowState.systemPrompt}
              onChange={(e) =>
                updateFlowState({ systemPrompt: e.target.value })
              }
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              AIの振る舞いを定義するプロンプトを入力してください
            </p>
          </div>

          {/* モデル選択 */}
          <div className="space-y-2">
            <Label htmlFor="modelId">AIモデル</Label>
            <Select
              value={flowState.modelId}
              onValueChange={(value) => updateFlowState({ modelId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="デフォルト（Claude 3.5 Sonnet）" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value || "default"}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              使用するAIモデルを選択してください
            </p>
          </div>

          {/* 可視性 */}
          <div className="space-y-2">
            <Label htmlFor="visibility">公開範囲</Label>
            <Select
              value={flowState.visibility}
              onValueChange={(value) =>
                updateFlowState({ visibility: value as McpServerVisibility })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-gray-500">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 次へボタン */}
      <div className="flex justify-end">
        <Button onClick={nextStep} disabled={!isBasicInfoValid}>
          次へ: MCP選択
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
