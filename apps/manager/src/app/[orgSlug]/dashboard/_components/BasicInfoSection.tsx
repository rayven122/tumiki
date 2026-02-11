"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Save, X, Users } from "lucide-react";
import { api } from "@/trpc/react";
import { getSessionInfo } from "~/lib/auth/session-utils";

export const BasicInfoSection = () => {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logoUrl: "",
  });

  const { data: organization, isLoading } = api.organization.getById.useQuery();

  const utils = api.useUtils();

  const updateMutation = api.organization.update.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      void utils.organization.getById.invalidate();
    },
  });

  const handleEdit = () => {
    if (organization) {
      setFormData({
        name: organization.name,
        description: organization.description ?? "",
        logoUrl: organization.logoUrl ?? "",
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ name: "", description: "", logoUrl: "" });
  };

  const handleSave = () => {
    updateMutation.mutate({
      ...formData,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-1/3 rounded bg-gray-200"></div>
            <div className="h-4 w-2/3 rounded bg-gray-200"></div>
            <div className="h-4 w-1/4 rounded bg-gray-200"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardContent>
          <p className="text-red-500">組織情報を読み込めませんでした。</p>
        </CardContent>
      </Card>
    );
  }

  // JWT のロールから管理者権限を取得
  const isAdmin = getSessionInfo(session).isAdmin;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>基本情報</CardTitle>
        {isAdmin && !isEditing && (
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Edit2 className="mr-2 h-4 w-4" />
            編集
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              キャンセル
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <Label htmlFor="name">組織名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="組織名を入力"
              />
            </div>
            <div>
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="組織の説明を入力"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="logoUrl">ロゴURL</Label>
              <Input
                id="logoUrl"
                value={formData.logoUrl}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, logoUrl: e.target.value }))
                }
                placeholder="https://example.com/logo.png"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-semibold">{organization.name}</h3>
              {organization.description && (
                <p className="mt-1 text-gray-600">{organization.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>{organization._count.members}名のメンバー</span>
            </div>

            {organization.logoUrl && (
              <div>
                <Label>ロゴ</Label>
                <img
                  src={organization.logoUrl}
                  alt="組織ロゴ"
                  className="mt-2 h-16 w-16 rounded object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="text-xs text-gray-400">
              作成日:{" "}
              {new Date(organization.createdAt).toLocaleDateString("ja-JP")}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
