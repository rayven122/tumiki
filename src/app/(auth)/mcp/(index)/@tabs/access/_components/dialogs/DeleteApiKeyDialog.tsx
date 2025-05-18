import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiKey } from "../ApiKeysTab";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";
import { Loader2 } from "lucide-react";
import { ToolBadgeList } from "../ToolBadgeList";
import { Input } from "@/components/ui/input";
import { useState } from "react";

type DeleteApiKeyDialogProps = {
  onClose: () => void;
  apiKey: ApiKey;
  onSuccess: () => Promise<void> | void;
};

export function DeleteApiKeyDialog({
  onClose,
  apiKey,
  onSuccess,
}: DeleteApiKeyDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const isConfirmed = confirmText === "削除";

  const { mutate: deleteApiKey, isPending } = api.apiKey.delete.useMutation({
    onSuccess: async (data) => {
      await onSuccess();
      toast.success(`API Key ${data.name}を削除しました`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const tools = apiKey.toolGroups.flatMap((toolGroup) =>
    toolGroup.toolGroupTools.map((toolGroupTool) => ({
      ...toolGroupTool.tool,
      userMcpServerName: toolGroupTool.userMcpServer.name ?? "",
    })),
  );

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key 削除</DialogTitle>
          <DialogDescription>
            このAPI Keyを削除してもよろしいですか？この操作は元に戻せません。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground mb-2 text-sm">
            以下のAPI Keyを削除します：
          </p>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-medium">{apiKey.name}</p>
            {tools.length > 0 && (
              <p className="text-muted-foreground mt-1 text-sm">
                ツール・ツールグループ：
                <ToolBadgeList
                  tools={tools}
                  // TODO: ツールグループの実装が完了したら設定する
                  toolGroups={[]}
                />
              </p>
            )}
          </div>
        </div>
        <div className="mb-4">
          <p className="text-muted-foreground mb-2 text-sm">
            削除するには、「削除」と入力してください：
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="削除"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteApiKey({ id: apiKey.id })}
            disabled={!isConfirmed || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                削除中...
              </>
            ) : (
              "削除"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
