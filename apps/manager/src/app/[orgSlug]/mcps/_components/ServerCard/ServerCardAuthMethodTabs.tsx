import { Info } from "lucide-react";
import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import { Alert, AlertDescription } from "@tumiki/ui/alert";
import type { Prisma } from "@tumiki/db/prisma";

type McpServerTemplate = Prisma.McpServerTemplateGetPayload<object>;

type AuthMethodTabsProps = {
  mcpServer: McpServerTemplate;
  envVars: Record<string, string>;
  isProcessing: boolean;
  onEnvVarChange: (envVar: string, value: string) => void;
};

export const AuthMethodTabs = ({
  mcpServer,
  envVars,
  isProcessing,
  onEnvVarChange,
}: AuthMethodTabsProps) => {
  // authTypeが"NONE"の場合はnullを返す
  if (mcpServer.authType === "NONE") {
    return null;
  }

  if (mcpServer.envVarKeys.length === 0) {
    return null;
  }

  if (mcpServer.authType === "API_KEY") {
    return (
      <ApiKeyInputs
        mcpServer={mcpServer}
        envVars={envVars}
        isProcessing={isProcessing}
        onEnvVarChange={onEnvVarChange}
      />
    );
  }

  // OAuth認証の場合
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          OAuth認証を使用すると、{mcpServer.name}
          アカウントでログインして自動的に必要な権限がすべて付与されます。
          トークンの有効期限が切れた場合は自動的に更新されます。
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border bg-gray-50 p-4">
        <h4 className="mb-2 font-medium">自動適用される権限</h4>
        <p className="text-muted-foreground mb-3 text-sm">
          OAuth認証では、必要な権限が自動的に管理されます。
          接続ボタンをクリックすると、{mcpServer.name}
          の認証画面に移動します。
        </p>
      </div>
    </div>
  );
};

type ApiKeyInputsProps = {
  mcpServer: McpServerTemplate;
  envVars: Record<string, string>;
  isProcessing: boolean;
  onEnvVarChange: (envVar: string, value: string) => void;
};

const ApiKeyInputs = ({
  mcpServer,
  envVars,
  isProcessing,
  onEnvVarChange,
}: ApiKeyInputsProps) => (
  <div className="space-y-4">
    {mcpServer.envVarKeys.map((envVar, index) => (
      <div key={envVar} className="space-y-2">
        <Label htmlFor={`token-${envVar}`} className="text-sm">
          {envVar}
        </Label>
        <Input
          id={`token-${envVar}`}
          type="password"
          placeholder={`${envVar}を入力してください`}
          value={envVars[envVar]}
          onChange={(e) => onEnvVarChange(envVar, e.target.value)}
          className="text-sm"
          disabled={isProcessing}
        />
        {index === mcpServer.envVarKeys.length - 1 && (
          <p className="text-muted-foreground text-xs">
            トークンは暗号化されて安全に保存されます
          </p>
        )}
      </div>
    ))}
  </div>
);
