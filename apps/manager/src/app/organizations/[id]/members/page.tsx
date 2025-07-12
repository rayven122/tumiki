"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { MemberTable } from "@/components/members/MemberTable";
import { MemberAddModal } from "@/components/members/MemberAddModal";
import { MemberFilters } from "@/components/members/MemberFilters";
import { MemberBulkActions } from "@/components/members/MemberBulkActions";

interface MemberFilters {
  search: string;
  roles: string[];
  groups: string[];
  isAdmin?: boolean;
}

const MembersPage = () => {
  const params = useParams();
  const organizationId = params.id as string;

  const [filters, setFilters] = useState<MemberFilters>({
    search: "",
    roles: [],
    groups: [],
    isAdmin: undefined,
  });

  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // メンバー一覧取得
  const {
    data: members,
    isLoading,
    error,
    refetch,
  } = trpc.organizationMember.getByOrganization.useQuery({
    organizationId,
    search: filters.search || undefined,
    roles: filters.roles.length > 0 ? filters.roles : undefined,
    groups: filters.groups.length > 0 ? filters.groups : undefined,
    isAdmin: filters.isAdmin,
  });

  // 組織の権限情報取得（組織が存在するかの確認も兼ねる）
  const { data: organizations } = trpc.organization.getUserOrganizations.useQuery();
  const currentOrganization = organizations?.find(org => org.id === organizationId);

  if (error) {
    toast.error("メンバー一覧の取得に失敗しました", {
      description: error.message,
    });
  }

  const handleFiltersChange = (newFilters: MemberFilters) => {
    setFilters(newFilters);
    setSelectedMembers([]); // フィルタ変更時に選択をクリア
  };

  const handleMemberAdded = () => {
    refetch();
    setIsAddModalOpen(false);
    toast.success("メンバーを追加しました");
  };

  const handleMemberUpdated = () => {
    refetch();
    setSelectedMembers([]);
    toast.success("メンバー情報を更新しました");
  };

  const handleMemberDeleted = () => {
    refetch();
    setSelectedMembers([]);
    toast.success("メンバーを削除しました");
  };

  const handleBulkActionCompleted = () => {
    refetch();
    setSelectedMembers([]);
  };

  const handleSelectMembers = (memberIds: string[]) => {
    setSelectedMembers(memberIds);
  };

  if (!currentOrganization) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">組織が見つかりません</h3>
            <p className="text-muted-foreground">
              指定された組織にアクセスする権限がないか、組織が存在しません。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">メンバー管理</h1>
          <p className="text-muted-foreground">
            {currentOrganization.name} のメンバーを管理します
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="self-start">
          <Plus className="mr-2 h-4 w-4" />
          メンバーを追加
        </Button>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
          <CardDescription>
            検索条件を指定してメンバーを絞り込むことができます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberFilters
            organizationId={organizationId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </CardContent>
      </Card>

      {/* 一括操作 */}
      {selectedMembers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <MemberBulkActions
              organizationId={organizationId}
              selectedMembers={selectedMembers}
              onCompleted={handleBulkActionCompleted}
            />
          </CardContent>
        </Card>
      )}

      {/* メンバー一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>メンバー一覧</CardTitle>
          <CardDescription>
            {isLoading ? "読み込み中..." : `${members?.length || 0} 人のメンバー`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberTable
            organizationId={organizationId}
            members={members || []}
            isLoading={isLoading}
            selectedMembers={selectedMembers}
            onSelectMembers={handleSelectMembers}
            onMemberUpdated={handleMemberUpdated}
            onMemberDeleted={handleMemberDeleted}
          />
        </CardContent>
      </Card>

      {/* メンバー追加モーダル */}
      <MemberAddModal
        organizationId={organizationId}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
};

export default MembersPage;