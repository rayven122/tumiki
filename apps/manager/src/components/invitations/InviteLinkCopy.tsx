"use client";

import { CopyIcon, CheckIcon, LinkIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface InviteLinkCopyProps {
  inviteUrl: string;
  email: string;
  className?: string;
}

/**
 * 招待リンクコピー機能コンポーネント
 * 招待URLをクリップボードにコピーする機能を提供
 */
export const InviteLinkCopy = ({ 
  inviteUrl, 
  email, 
  className 
}: InviteLinkCopyProps) => {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("クリップボードへのコピーに失敗しました:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("flex items-center gap-1", className)}
        >
          <LinkIcon className="size-3" />
          招待リンク
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="size-5" />
            招待リンク
          </DialogTitle>
          <DialogDescription>
            {email} への招待リンクです。このリンクを共有して招待を送信できます。
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={inviteUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              {copied ? (
                <CheckIcon className="size-4 text-green-600" />
              ) : (
                <CopyIcon className="size-4" />
              )}
            </Button>
          </div>
          
          {copied && (
            <div className="text-sm text-green-600 flex items-center gap-1">
              <CheckIcon className="size-4" />
              クリップボードにコピーしました
            </div>
          )}
          
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">このリンクの特徴:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>特定のメールアドレス（{email}）専用です</li>
              <li>有効期限があります</li>
              <li>一度使用すると無効になります</li>
              <li>管理者によってキャンセルできます</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};