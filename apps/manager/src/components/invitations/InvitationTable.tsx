"use client";

import { MoreHorizontalIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { InvitationStatus } from "./InvitationStatus";
import { InviteLinkCopy } from "./InviteLinkCopy";

// 招待データの型定義
type InvitationData = {
  id: string;
  email: string;
  isAdmin: boolean;
  expires: Date;
  createdAt: Date;
  isExpired: boolean;
  invitedBy: {
    name: string | null;
    email: string | null;
  };
  inviteUrl: string;
};

interface InvitationTableProps {
  organizationId: string;
  invitations: InvitationData[];
}

/**
 * 招待一覧テーブルコンポーネント
 * 組織の招待一覧を表示し、管理機能を提供
 */
export const InvitationTable = ({ 
  organizationId, 
  invitations 
}: InvitationTableProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<InvitationData | null>(null);

  const utils = trpc.useUtils();
  
  const cancelInvitationMutation = trpc.organizationInvitation.cancel.useMutation({
    onSuccess: () => {
      // 招待一覧を再取得
      void utils.organizationInvitation.getByOrganization.invalidate({ organizationId });
      setDeleteDialogOpen(false);
      setSelectedInvitation(null);
    },
  });

  const resendInvitationMutation = trpc.organizationInvitation.resend.useMutation({
    onSuccess: () => {
      // 招待一覧を再取得
      void utils.organizationInvitation.getByOrganization.invalidate({ organizationId });
    },
  });

  const handleCancel = (invitation: InvitationData) => {
    setSelectedInvitation(invitation);
    setDeleteDialogOpen(true);
  };

  const handleResend = (invitationId: string) => {
    resendInvitationMutation.mutate({ invitationId });
  };

  const confirmCancel = () => {
    if (selectedInvitation) {
      cancelInvitationMutation.mutate({ invitationId: selectedInvitation.id });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>招待はありません</p>
        <p className="text-sm mt-1">新しいメンバーを招待してください</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>メールアドレス</TableHead>
            <TableHead>権限</TableHead>
            <TableHead>状態</TableHead>
            <TableHead>招待者</TableHead>
            <TableHead>作成日時</TableHead>
            <TableHead>有効期限</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium">
                {invitation.email}
              </TableCell>
              <TableCell>
                {invitation.isAdmin ? (
                  <Badge variant="destructive">管理者</Badge>
                ) : (
                  <Badge variant="secondary">メンバー</Badge>
                )}
              </TableCell>
              <TableCell>
                <InvitationStatus
                  isExpired={invitation.isExpired}
                  expiresAt={invitation.expires}
                />
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium">
                    {invitation.invitedBy.name ?? "Unknown"}
                  </div>
                  <div className="text-muted-foreground">
                    {invitation.invitedBy.email}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {formatDate(invitation.createdAt)}
              </TableCell>
              <TableCell className="text-sm">
                {formatDate(invitation.expires)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <InviteLinkCopy
                        inviteUrl={invitation.inviteUrl}
                        email={invitation.email}
                        className="w-full justify-start"
                      />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleResend(invitation.id)}
                      disabled={resendInvitationMutation.isPending}
                    >
                      <RefreshCwIcon className="size-4 mr-2" />
                      再送
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleCancel(invitation)}
                      className="text-destructive"
                    >
                      <TrashIcon className="size-4 mr-2" />
                      キャンセル
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>招待のキャンセル</DialogTitle>
            <DialogDescription>
              {selectedInvitation?.email} への招待をキャンセルしますか？
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={cancelInvitationMutation.isPending}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={cancelInvitationMutation.isPending}
            >
              {cancelInvitationMutation.isPending ? "キャンセル中..." : "招待をキャンセル"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};