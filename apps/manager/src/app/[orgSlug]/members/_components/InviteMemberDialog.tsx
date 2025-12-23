"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { api } from "@/trpc/react";
import { SuccessAnimation } from "@/app/_components/ui/SuccessAnimation";
import { type OrganizationId } from "@/schema/ids";

type InviteMemberDialogProps = {
  organizationId: OrganizationId;
};

export const InviteMemberDialog = ({
  organizationId: _organizationId,
}: InviteMemberDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const utils = api.useUtils();

  const inviteMutation = api.organization.inviteMember.useMutation({
    onSuccess: () => {
      setEmail("");
      setIsOpen(false);
      setShowSuccessAnimation(true);
      void utils.organization.getBySlug.invalidate();
      void utils.organization.getInvitations.invalidate();
      setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 3000);
    },
  });

  const handleInvite = () => {
    if (email.trim()) {
      inviteMutation.mutate({
        email: email.trim(),
        roles: ["Member"],
      });
    }
  };

  return (
    <>
      {/* メンバー招待成功時のアニメーション */}
      {showSuccessAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <SuccessAnimation
            title="招待を送信しました！"
            description="招待メールが送信されました。<br/>メンバーが承認するとチームに参加できます。"
            className=""
          />
        </div>
      )}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            メンバーを招待
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メンバーを招待</DialogTitle>
            <DialogDescription>
              招待したいメンバーのメールアドレスを入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!email.trim() || inviteMutation.isPending}
              >
                招待を送信
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
