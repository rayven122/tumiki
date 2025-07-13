"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Users, ArrowRight, CheckCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrganizationCreateForm } from "@/components/organizations/OrganizationCreateForm";
import { toast } from "sonner";

const OnboardingPage = () => {
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<
    "personal" | "team" | null
  >(null);
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isCreatingPersonalOrg, setIsCreatingPersonalOrg] = useState(false);

  const createOrganizationMutation = api.organization.create.useMutation();

  const handlePersonalUse = async () => {
    setSelectedOption("personal");
    setIsCreatingPersonalOrg(true);

    try {
      // 個人組織を自動作成
      await createOrganizationMutation.mutateAsync({
        name: "個人組織",
        description: "個人利用のための組織です",
        logoUrl: null,
        isPersonal: true,
      });

      toast.success("個人組織が作成されました。");

      // MCPサーバー管理画面にリダイレクト
      void router.push("/mcp");
    } catch {
      toast.error("個人組織の作成に失敗しました");
      setSelectedOption(null);
    } finally {
      setIsCreatingPersonalOrg(false);
    }
  };

  const handleTeamUse = () => {
    setSelectedOption("team");
    setIsOrgDialogOpen(true);
  };

  const handleOrganizationCreated = () => {
    setIsOrgDialogOpen(false);
    toast.success("組織が作成されました。");
    void router.push("/mcp");
  };

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center py-10">
      <div className="w-full max-w-4xl">
        {/* ヘッダー */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold">Tumikiへようこそ！</h1>
          <p className="text-muted-foreground text-xl">
            MCPサーバー管理を始めるために、利用形態を選択してください
          </p>
        </div>

        {/* オプション選択 */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* 個人利用オプション */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedOption === "personal" ? "ring-primary ring-2" : ""
            }`}
            onClick={handlePersonalUse}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">個人利用</CardTitle>
              <CardDescription className="text-base">
                一人でMCPサーバーを管理したい
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  簡単セットアップ
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  個人用組織を自動作成
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  すべての機能を利用可能
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  後からチーム招待も可能
                </li>
              </ul>
              <Button
                className="mt-6 w-full"
                disabled={isCreatingPersonalOrg}
                onClick={(e) => {
                  e.stopPropagation();
                  void handlePersonalUse();
                }}
              >
                {isCreatingPersonalOrg ? (
                  "作成中..."
                ) : (
                  <>
                    個人利用で開始
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* チーム利用オプション */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedOption === "team" ? "ring-primary ring-2" : ""
            }`}
            onClick={handleTeamUse}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-2xl">チーム利用</CardTitle>
              <CardDescription className="text-base">
                チームでMCPサーバーを共有管理したい
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  組織名とロゴを設定
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  メンバー招待機能
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  ロールベース権限管理
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  チーム用ダッシュボード
                </li>
              </ul>
              <Button
                className="mt-6 w-full"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTeamUse();
                }}
              >
                組織を作成
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 後で決めるオプション */}
        <div className="mt-8 text-center">
          <p className="text-muted-foreground mb-4 text-sm">
            どちらにするか迷っている場合
          </p>
          <Button variant="ghost" onClick={() => router.push("/mcp")}>
            スキップしてMCPサーバー管理画面へ
          </Button>
        </div>
      </div>

      {/* 組織作成ダイアログ */}
      <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新しい組織を作成</DialogTitle>
            <DialogDescription>
              チーム用の組織を作成します。組織名、説明、ロゴを設定してください。
            </DialogDescription>
          </DialogHeader>
          <OrganizationCreateForm onSuccess={handleOrganizationCreated} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnboardingPage;
