"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { redirect } from "next/navigation";
import {
  Users,
  Settings,
  UserPlus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InviteMemberModal } from "./_components/InviteMemberModal";
import { mockMembers, mockRoles } from "./_components/mockData";
import type { OrganizationMember, Role } from "./_components/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RolesPage = () => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // クライアントサイドで組織を取得
  const { data: organizations, isLoading } =
    api.organization.getUserOrganizations.useQuery();

  // デフォルト組織を探す
  const defaultOrg = organizations?.find((org) => org.isDefault);

  // デモ用のデータ（実際の実装ではAPIから取得）
  const members: OrganizationMember[] = mockMembers;
  const roles: Role[] = mockRoles;

  // フィルタリング
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole =
      selectedRole === "all" || member.role.id === selectedRole;
    const matchesStatus =
      selectedStatus === "all" || member.status === selectedStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // 統計情報
  const stats = {
    totalMembers: members.length,
    activeMembers: members.filter((m) => m.status === "active").length,
    invitedMembers: members.filter((m) => m.status === "invited").length,
    totalRoles: roles.length,
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="mb-8 h-32 rounded-xl bg-gray-200"></div>
            <div className="h-64 rounded-xl bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  // 個人組織またはデフォルト組織がない場合はMCPサーバーページへリダイレクト
  if (!defaultOrg || defaultOrg.isPersonal) {
    redirect("/mcp/servers");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ヘッダーセクション */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ロール管理</h1>
                <p className="mt-1 text-gray-600">
                  組織のメンバーと権限を管理します
                </p>
              </div>
            </div>
            <Button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              メンバーを招待
            </Button>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalMembers}
              </div>
              <div className="text-sm text-gray-600">総メンバー数</div>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <div className="text-2xl font-bold text-green-900">
                {stats.activeMembers}
              </div>
              <div className="text-sm text-green-600">アクティブ</div>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="text-2xl font-bold text-blue-900">
                {stats.invitedMembers}
              </div>
              <div className="text-sm text-blue-600">招待中</div>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <div className="text-2xl font-bold text-purple-900">
                {stats.totalRoles}
              </div>
              <div className="text-sm text-purple-600">ロール数</div>
            </div>
          </div>
        </div>

        {/* メンバー一覧セクション */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>メンバー一覧</CardTitle>
              <div className="flex items-center gap-2">
                {/* 検索バー */}
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="名前またはメールで検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10"
                  />
                </div>

                {/* ロールフィルター */}
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="ロール" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべてのロール</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* ステータスフィルター */}
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="ステータス" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="active">アクティブ</SelectItem>
                    <SelectItem value="invited">招待中</SelectItem>
                    <SelectItem value="inactive">非アクティブ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMembers.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                該当するメンバーが見つかりません
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                        <AvatarFallback>
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{member.name}</div>
                          {member.isAdmin && (
                            <Badge variant="default" className="text-xs">
                              管理者
                            </Badge>
                          )}
                          {member.status === "invited" && (
                            <Badge variant="secondary" className="text-xs">
                              招待中
                            </Badge>
                          )}
                          {member.status === "inactive" && (
                            <Badge variant="outline" className="text-xs">
                              非アクティブ
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{member.role.name}</div>
                        <div className="text-xs text-gray-500">
                          {member.joinedAt
                            ? `参加日: ${member.joinedAt.toLocaleDateString("ja-JP")}`
                            : member.invitedAt
                              ? `招待日: ${member.invitedAt.toLocaleDateString("ja-JP")}`
                              : ""}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 招待モーダル */}
        <InviteMemberModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          organizationId={defaultOrg.id}
          onSuccess={() => {
            // 成功時の処理（例：メンバーリストを再取得）
          }}
        />
      </div>
    </div>
  );
};

export default RolesPage;
