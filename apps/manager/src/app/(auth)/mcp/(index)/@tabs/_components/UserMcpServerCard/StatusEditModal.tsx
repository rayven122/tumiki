"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "@/utils/client/toast";
import { api } from "@/trpc/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ServerStatus } from "@tumiki/db";
import { Loader2 } from "lucide-react";

type StatusEditModalProps = {
  serverInstanceId: string;
  initialStatus: ServerStatus;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export const StatusEditModal = ({
  serverInstanceId,
  initialStatus,
  onOpenChange,
  onSuccess,
}: StatusEditModalProps) => {
  const [status, setStatus] = useState<ServerStatus>(initialStatus);

  const router = useRouter();

  const { mutate: updateStatus, isPending } =
    api.userMcpServerInstance.updateStatus.useMutation({
      onSuccess: () => {
        toast.success("サーバーステータスを更新しました");
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
          onOpenChange(false);
        }
      },
      onError: (error) => {
        toast.error(`エラーが発生しました: ${error.message}`);
      },
    });

  const handleSubmit = () => {
    updateStatus({
      id: serverInstanceId,
      serverStatus: status,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>サーバーステータスの変更</DialogTitle>
          <DialogDescription>
            サーバーのステータスを変更します。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              ステータス
            </Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as ServerStatus)}
              disabled={isPending}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="ステータスを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RUNNING">稼働中</SelectItem>
                <SelectItem value="STOPPED">停止中</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                更新中...
              </>
            ) : (
              "更新"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
