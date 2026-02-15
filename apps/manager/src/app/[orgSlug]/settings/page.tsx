"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  Trash2,
  Info,
  Loader2,
  Edit2,
  Save,
  X,
  Building2,
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { SlackConnectionSection } from "@/features/slack-integration";
import { getSessionInfo } from "@/lib/auth/session-utils";
import { McpServerIcon } from "../mcps/_components/McpServerIcon";
import { WorkspaceIconEditModal } from "./_components/WorkspaceIconEditModal";

// 一般設定フォームの型定義
type GeneralFormData = {
  name: string;
};

// 表示専用フィールドのprops型
type DisplayFieldProps = {
  label: string;
  children: React.ReactNode;
};

// 表示専用フィールドコンポーネント
const DisplayField = ({ label, children }: DisplayFieldProps) => (
  <div className="space-y-1">
    <Label className="text-muted-foreground text-sm">{label}</Label>
    {children}
  </div>
);

// 一般設定表示のprops型
type GeneralSettingsDisplayProps = {
  organization?: { name: string } | null;
};

// 一般設定表示コンポーネント（ワークスペース名のみ）
const GeneralSettingsDisplay = ({
  organization,
}: GeneralSettingsDisplayProps) => (
  <DisplayField label="ワークスペース名">
    <p className="text-lg font-medium">{organization?.name}</p>
  </DisplayField>
);

const SettingsPage = () => {
  const { data: session, update } = useSession();
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // 一般設定用の状態
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [generalFormData, setGeneralFormData] = useState<GeneralFormData>({
    name: "",
  });
  // ロゴ編集モーダルの状態
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);

  // 現在の組織情報を取得
  const { data: organization, isLoading: isLoadingOrg } =
    api.organization.getById.useQuery();

  // ユーザーの組織一覧を取得（削除後のリダイレクト先用）
  const { data: userOrganizations } =
    api.organization.getUserOrganizations.useQuery();

  // 個人組織を取得
  const personalOrg = userOrganizations?.find((org) => org.isPersonal);

  const utils = api.useUtils();

  // 一般設定更新mutation
  const updateMutation = api.organization.update.useMutation({
    onSuccess: () => {
      toast.success("設定を保存しました");
      setIsEditingGeneral(false);
      void utils.organization.getById.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "設定の保存に失敗しました");
    },
  });

  // 組織削除mutation
  const deleteMutation = api.organization.delete.useMutation({
    onSuccess: async () => {
      toast.success("ワークスペースを削除しました");
      // セッションを更新
      await update();
      // 個人組織のダッシュボードへリダイレクト
      if (personalOrg) {
        router.push(`/${personalOrg.slug}/mcps`);
      } else {
        router.push("/onboarding");
      }
    },
    onError: (error) => {
      setIsDeleting(false);
      toast.error(error.message || "ワークスペースの削除に失敗しました");
    },
  });

  // JWT のロールから管理者権限を取得
  const isAdmin = getSessionInfo(session).isAdmin;

  // オーナーかどうかを判定（組織の作成者 = オーナー）
  const isOwner = organization?.createdBy === session?.user.id;

  // 削除確認テキストが一致しているか
  const canDelete = confirmText === organization?.name;

  // 一般設定の編集開始
  const handleEditGeneral = () => {
    if (organization) {
      setGeneralFormData({
        name: organization.name,
      });
      setIsEditingGeneral(true);
    }
  };

  // 一般設定の編集キャンセル
  const handleCancelGeneral = () => {
    setIsEditingGeneral(false);
    setGeneralFormData({ name: "" });
  };

  // 一般設定の保存
  const handleSaveGeneral = () => {
    updateMutation.mutate({
      name: generalFormData.name || undefined,
    });
  };

  // ロゴの保存
  const handleSaveLogo = (iconPath: string | null) => {
    updateMutation.mutate({
      logoUrl: iconPath ?? undefined,
    });
    setIsIconModalOpen(false);
  };

  // 削除ハンドラー
  const handleDelete = () => {
    if (!organization?.id || !canDelete) return;
    setIsDeleting(true);
    deleteMutation.mutate({ organizationId: organization.id });
  };

  if (isLoadingOrg) {
    return (
      <div className="container mx-auto flex min-h-[400px] items-center justify-center py-6">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-6 md:px-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold">設定</h1>
        <p className="text-muted-foreground mt-2">ワークスペースの設定を管理</p>
      </div>

      {/* Slack連携セクション */}
      <SlackConnectionSection />

      {/* 一般設定セクション */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>一般設定</CardTitle>
          {isAdmin && !isEditingGeneral && (
            <Button variant="outline" size="sm" onClick={handleEditGeneral}>
              <Edit2 className="mr-2 h-4 w-4" />
              編集
            </Button>
          )}
          {isEditingGeneral && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelGeneral}
                disabled={updateMutation.isPending}
              >
                <X className="mr-2 h-4 w-4" />
                キャンセル
              </Button>
              <Button
                size="sm"
                onClick={handleSaveGeneral}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                保存
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingGeneral ? (
            <div className="space-y-2">
              <Label htmlFor="workspace-name">ワークスペース名</Label>
              <Input
                id="workspace-name"
                value={generalFormData.name}
                onChange={(e) =>
                  setGeneralFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="ワークスペース名を入力"
              />
            </div>
          ) : (
            <GeneralSettingsDisplay organization={organization} />
          )}
          {/* ロゴ編集（編集モード関係なく表示） */}
          {isAdmin && (
            <div className="space-y-2">
              <Label>ロゴ</Label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsIconModalOpen(true)}
                  className="group relative flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 transition-colors hover:border-gray-400"
                >
                  {organization?.logoUrl ? (
                    <McpServerIcon
                      iconPath={organization.logoUrl}
                      alt="ワークスペースロゴ"
                      size={40}
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-gray-400" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <Edit2 className="h-4 w-4 text-white" />
                  </div>
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsIconModalOpen(true)}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  ロゴを変更
                </Button>
              </div>
            </div>
          )}
          {!isAdmin && !isEditingGeneral && (
            <DisplayField label="ロゴ">
              {organization?.logoUrl ? (
                <McpServerIcon
                  iconPath={organization.logoUrl}
                  alt="ワークスペースロゴ"
                  size={48}
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                  <Building2 className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </DisplayField>
          )}
        </CardContent>
      </Card>

      {/* 危険なゾーンセクション（オーナーのみ表示） */}
      {isOwner && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>危険なゾーン</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-medium">ワークスペースを削除</h4>
                <p className="text-muted-foreground text-sm">
                  この操作は取り消せません。ワークスペースに関連するすべてのデータが完全に削除されます。
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="shrink-0">
                    <Trash2 className="mr-2 h-4 w-4" />
                    ワークスペースを削除
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span>ワークスペースを削除しますか？</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4">
                        <p>
                          <strong className="text-foreground">
                            {organization?.name}
                          </strong>{" "}
                          を削除しようとしています。
                        </p>
                        <div className="bg-muted rounded-lg p-3 text-sm">
                          <ul className="text-muted-foreground list-inside list-disc space-y-1">
                            <li>
                              すべてのメンバーがワークスペースから削除されます
                            </li>
                            <li>MCPサーバー設定が削除されます</li>
                            <li>保留中の招待がキャンセルされます</li>
                            <li>この操作は取り消せません</li>
                          </ul>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label htmlFor="confirm-delete">
                            確認のため、ワークスペース名{" "}
                            <strong>{organization?.name}</strong>{" "}
                            を入力してください
                          </Label>
                          <Input
                            id="confirm-delete"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={organization?.name}
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => setConfirmText("")}
                      disabled={isDeleting}
                    >
                      キャンセル
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={!canDelete || isDeleting}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          削除中...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          完全に削除
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* オーナーでない場合のメッセージ */}
      {!isOwner && (
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="text-muted-foreground flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <p>ワークスペースの削除は、オーナーのみが実行できます。</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ロゴ編集モーダル */}
      {isIconModalOpen && (
        <WorkspaceIconEditModal
          initialIconPath={organization?.logoUrl ?? null}
          orgSlug={orgSlug}
          onSave={handleSaveLogo}
          isSaving={updateMutation.isPending}
          onOpenChange={setIsIconModalOpen}
        />
      )}
    </div>
  );
};

export default SettingsPage;
