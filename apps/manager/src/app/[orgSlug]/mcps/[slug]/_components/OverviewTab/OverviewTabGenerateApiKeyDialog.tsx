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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

type GenerateApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (expiresAt: Date | undefined) => void;
  isGenerating: boolean;
};

export const GenerateApiKeyDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isGenerating,
}: GenerateApiKeyDialogProps) => {
  const [expiryOption, setExpiryOption] = useState<string>("7days");

  const handleConfirm = () => {
    let expiresAt: Date | undefined;

    if (expiryOption !== "never") {
      const now = new Date();
      switch (expiryOption) {
        case "7days":
          expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "30days":
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case "90days":
          expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
          break;
        case "1year":
          expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    onConfirm(expiresAt);
    setExpiryOption("7days");
  };

  const handleCancel = () => {
    onOpenChange(false);
    setExpiryOption("7days");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>APIキーの発行</DialogTitle>
          <DialogDescription>
            安全性を高めるため、できるだけ短い有効期限を設定してください。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-3">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expiry" className="text-right">
              有効期限
            </Label>
            <Select value={expiryOption} onValueChange={setExpiryOption}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="有効期限を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7日間</SelectItem>
                <SelectItem value="30days">30日間</SelectItem>
                <SelectItem value="90days">90日間</SelectItem>
                <SelectItem value="1year">1年間</SelectItem>
                <SelectItem value="never">無期限</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {expiryOption === "never" && (
            <Alert variant="destructive" className="col-span-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                無期限のAPIキーは流出時のリスクが高くなります。定期的なローテーションを強く推奨します。
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isGenerating}
          >
            キャンセル
          </Button>
          <Button onClick={handleConfirm} disabled={isGenerating}>
            {isGenerating ? "発行中..." : "発行"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
