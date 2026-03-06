import { Loader2 } from "lucide-react";
import { Button } from "@tumiki/ui/button";
import type { Prisma } from "@tumiki/db/prisma";

type McpServerTemplate = Prisma.McpServerTemplateGetPayload<object>;

type FormActionsProps = {
  mode: "create" | "edit";
  mcpServer: McpServerTemplate;
  isFormValid: boolean;
  isProcessing: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

export const FormActions = ({
  mode,
  mcpServer,
  isFormValid,
  isProcessing,
  onCancel,
  onSubmit,
}: FormActionsProps) => {
  const isOAuthMode = mcpServer.authType === "OAUTH";

  const getButtonText = () => {
    if (isProcessing) {
      if (isOAuthMode) return "OAuth接続中...";
      return mode === "create" ? "追加中..." : "更新中...";
    }

    if (isOAuthMode) return "認証";
    return mode === "create" ? "追加" : "更新";
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
