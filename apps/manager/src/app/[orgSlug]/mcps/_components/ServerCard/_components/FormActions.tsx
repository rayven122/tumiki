import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@tumiki/db/prisma";

type McpServerTemplate = Prisma.McpServerTemplateGetPayload<object>;

type FormActionsProps = {
  mode: "create" | "edit";
  mcpServer: McpServerTemplate;
  authMethod: "oauth" | "apikey";
  isFormValid: boolean;
  isProcessing: boolean;
  isAdding: boolean;
  isValidating: boolean;
  isOAuthConnecting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

export const FormActions = ({
  mode,
  mcpServer,
  authMethod,
  isFormValid,
  isProcessing,
  isAdding,
  isValidating,
  isOAuthConnecting,
  onCancel,
  onSubmit,
}: FormActionsProps) => {
  const isOAuthSupported = mcpServer.authType === "OAUTH";
  const isOAuthMode = isOAuthSupported && authMethod === "oauth";

  const getButtonText = () => {
    if (isProcessing) {
      if (isAdding) return "追加中...";
      if (isValidating) return "検証中...";
      if (isOAuthConnecting) return "OAuth接続中...";
      return "更新中...";
    }

    if (isOAuthMode) return "認証";
    return mode === "create" ? "保存" : "更新";
  };

  const isSubmitDisabled = isOAuthMode
    ? isProcessing
    : !isFormValid || isProcessing;

  return (
    <div className="flex justify-end space-x-2">
      <Button
        variant="outline"
        onClick={onCancel}
        size="sm"
        disabled={isProcessing}
      >
        キャンセル
      </Button>
      <Button onClick={onSubmit} disabled={isSubmitDisabled} size="sm">
        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {getButtonText()}
      </Button>
    </div>
  );
};
