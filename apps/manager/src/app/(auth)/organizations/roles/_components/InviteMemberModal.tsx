"use client";

import { useState, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mail,
  Plus,
  X,
  AlertCircle,
  Users,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import { api } from "@/trpc/react";
import type { OrganizationId } from "@/schema/ids";
import type { InvitationFormData, ValidationError, Role } from "./types";
import { mockRoles } from "./mockData";
import { clsx } from "clsx";

type InviteMemberModalProps = {
  isOpen: boolean;
  onClose: () => void;
  organizationId: OrganizationId;
  onSuccess?: () => void;
};

// メールアドレスのバリデーション
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 複数メールアドレスのパース（カンマ、改行、スペース区切り対応）
const parseEmails = (input: string): string[] => {
  return input
    .split(/[,\n\s]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
};

export const InviteMemberModal = ({
  isOpen,
  onClose,
  organizationId,
  onSuccess,
}: InviteMemberModalProps) => {
  const [emailInput, setEmailInput] = useState("");
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationResults, setInvitationResults] = useState<
    Array<{ email: string; success: boolean; error?: string }>
  >([]);

  const utils = api.useUtils();

  // デモ用のロールデータ（実際の実装ではAPIから取得）
  const availableRoles: Role[] = mockRoles;

  // メールアドレスの追加
  const handleAddEmails = useCallback(() => {
    const emails = parseEmails(emailInput);
    const errors: ValidationError[] = [];
    const validEmails: string[] = [];

    emails.forEach((email) => {
      if (!validateEmail(email)) {
        errors.push({
          field: "email",
          message: `"${email}" は無効なメールアドレスです`,
        });
      } else if (parsedEmails.includes(email)) {
        errors.push({
          field: "email",
          message: `"${email}" は既に追加されています`,
        });
      } else {
        validEmails.push(email);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
    } else {
      setParsedEmails([...parsedEmails, ...validEmails]);
      setEmailInput("");
      setValidationErrors([]);
    }
  }, [emailInput, parsedEmails]);

  // メールアドレスの削除
  const handleRemoveEmail = (emailToRemove: string) => {
    setParsedEmails(parsedEmails.filter((email) => email !== emailToRemove));
  };

  // 招待の送信（デモ実装）
  const handleSubmit = async () => {
    const errors: ValidationError[] = [];

    // バリデーション
    if (parsedEmails.length === 0) {
      errors.push({
        field: "email",
        message: "少なくとも1つのメールアドレスを入力してください",
      });
    }

    if (!selectedRoleId && !isAdmin) {
      errors.push({
        field: "role",
        message: "ロールを選択するか、管理者として招待してください",
      });
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setValidationErrors([]);

    // デモ用の処理（実際にはAPIを呼び出す）
    try {
      // 各メールアドレスに対して招待を送信
      const results = await Promise.all(
        parsedEmails.map(async (email) => {
          try {
            // 実際のAPI呼び出しをここに実装
            // const result = await api.organization.inviteMember.mutate({
            //   organizationId,
            //   email,
            //   roleId: selectedRoleId,
            //   isAdmin,
            //   customMessage,
            // });

            // デモ用のダミー処理
            await new Promise((resolve) => setTimeout(resolve, 500));

            // ランダムに成功/失敗を決定（デモ用）
            if (Math.random() > 0.8) {
              throw new Error("既に招待されています");
            }

            return { email, success: true };
          } catch (error) {
            return {
              email,
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "招待の送信に失敗しました",
            };
          }
        }),
      );

      setInvitationResults(results);

      // 全て成功した場合は閉じる
      const allSuccess = results.every((r) => r.success);
      if (allSuccess) {
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // モーダルを閉じる
  const handleClose = () => {
    setEmailInput("");
    setParsedEmails([]);
    setSelectedRoleId("");
    setIsAdmin(false);
    setCustomMessage("");
    setValidationErrors([]);
    setInvitationResults([]);
    onClose();
  };

  // 管理者チェックボックスの変更
  const handleAdminChange = (checked: boolean) => {
    setIsAdmin(checked);
    if (checked) {
      setSelectedRoleId(""); // 管理者の場合はロール選択をクリア
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            メンバーを招待
          </DialogTitle>
          <DialogDescription>
            組織に新しいメンバーを招待します。複数のメールアドレスを一度に入力できます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* メールアドレス入力 */}
          <div className="space-y-2">
            <Label htmlFor="emails">
              メールアドレス
              <span className="ml-2 text-xs text-gray-500">
                (カンマ、改行、スペースで区切って複数入力可能)
              </span>
            </Label>
            <div className="flex gap-2">
              <Textarea
                id="emails"
                placeholder="user1@example.com, user2@example.com&#10;user3@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="min-h-[80px]"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleAddEmails}
                disabled={!emailInput.trim() || isSubmitting}
              >
                <Plus className="h-4 w-4" />
                追加
              </Button>
            </div>

            {/* 追加されたメールアドレス */}
            {parsedEmails.length > 0 && (
              <ScrollArea className="h-24 w-full rounded-md border p-2">
                <div className="flex flex-wrap gap-2">
                  {parsedEmails.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3" />
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1 hover:text-red-600"
                        disabled={isSubmitting}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* ロール選択 */}
          <div className="space-y-2">
            <Label htmlFor="role">ロール</Label>
            <Select
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              disabled={isAdmin || isSubmitting}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="ロールを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex w-full items-center justify-between">
                      <span>{role.name}</span>
                      {role.isSystem && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          システム
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 管理者として招待 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="admin"
              checked={isAdmin}
              onCheckedChange={handleAdminChange}
              disabled={isSubmitting}
            />
            <Label
              htmlFor="admin"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              管理者として招待
            </Label>
          </div>

          {/* カスタムメッセージ */}
          <div className="space-y-2">
            <Label htmlFor="message">
              招待メッセージ（オプション）
              <span className="ml-2 text-xs text-gray-500">
                デフォルトのメッセージに追加されます
              </span>
            </Label>
            <Textarea
              id="message"
              placeholder="チームへようこそ！一緒に素晴らしいものを作りましょう。"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[60px]"
              disabled={isSubmitting}
            />
          </div>

          {/* エラー表示 */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-inside list-disc space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* 招待結果 */}
          {invitationResults.length > 0 && (
            <Alert
              variant={
                invitationResults.every((r) => r.success)
                  ? "default"
                  : "destructive"
              }
            >
              <AlertDescription>
                <div className="space-y-2">
                  {invitationResults.map((result, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {result.success ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-600" />
                      )}
                      <span
                        className={clsx(
                          result.success ? "text-green-600" : "text-red-600",
                        )}
                      >
                        {result.email}
                        {result.error && `: ${result.error}`}
                      </span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || parsedEmails.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                送信中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                招待を送信 ({parsedEmails.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
