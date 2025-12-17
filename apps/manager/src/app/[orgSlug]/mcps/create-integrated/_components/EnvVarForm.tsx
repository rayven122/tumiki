"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EnvVarFormProps = {
  envVarKeys: string[];
  envVars: Record<string, string>;
  onEnvVarChange: (key: string, value: string) => void;
};

/**
 * 環境変数入力フォームコンポーネント
 */
export const EnvVarForm = ({
  envVarKeys,
  envVars,
  onEnvVarChange,
}: EnvVarFormProps) => {
  if (envVarKeys.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
      <h4 className="text-sm font-medium text-gray-700">環境変数</h4>
      {envVarKeys.map((key, index) => (
        <div key={key}>
          <Label htmlFor={key} className="text-sm">
            {key}
          </Label>
          <Input
            id={key}
            type="password"
            value={envVars[key] ?? ""}
            onChange={(e) => onEnvVarChange(key, e.target.value)}
            placeholder={`${key}を入力してください`}
            className="mt-1"
          />
          {index === envVarKeys.length - 1 && (
            <p className="text-muted-foreground mt-2 text-xs">
              トークンは暗号化されて安全に保存されます
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
