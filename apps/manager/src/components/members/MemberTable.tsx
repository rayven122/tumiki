"use client";

import { useState } from "react";
import { trpc } from "@/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Shield, 
  ShieldOff, 
  Edit, 
  Trash2, 
  Crown,
  User
} from "lucide-react";
import { toast } from "sonner";
import { MemberEditModal } from "./MemberEditModal";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface Member {
  id: string;
  userId: string;
  isAdmin: boolean;
  user: User;
  roles: Role[];
  groups: Group[];
  createdAt: Date;
  updatedAt: Date;
}

interface MemberTableProps {
  organizationId: string;
  members: Member[];
  isLoading: boolean;
  selectedMembers: string[];
  onSelectMembers: (memberIds: string[]) => void;
  onMemberUpdated: () => void;
  onMemberDeleted: () => void;
}

export const MemberTable = ({
  organizationId,
  members,
  isLoading,
  selectedMembers,
  onSelectMembers,
  onMemberUpdated,
  onMemberDeleted,
}: MemberTableProps) => {
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // 管理者権限切り替え
  const toggleAdminMutation = trpc.organizationMember.toggleAdmin.useMutation({
    onSuccess: () => {
      onMemberUpdated();
      toast.success("管理者権限を更新しました");
    },
    onError: (error) => {
      toast.error("管理者権限の更新に失敗しました", {
        description: error.message,
      });
    },
  });

  // メンバー削除
  const removeMemberMutation = trpc.organizationMember.remove.useMutation({
    onSuccess: () => {
      onMemberDeleted();
      toast.success("メンバーを削除しました");
    },
    onError: (error) => {
      toast.error("メンバーの削除に失敗しました", {
        description: error.message,
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectMembers(members.map(member => member.id));
    } else {
      onSelectMembers([]);
    }
  };

  const handleSelectMember = (memberId: string, checked: boolean) => {
    if (checked) {
      onSelectMembers([...selectedMembers, memberId]);
    } else {
      onSelectMembers(selectedMembers.filter(id => id !== memberId));
    }
  };

  const handleToggleAdmin = (member: Member) => {
    toggleAdminMutation.mutate({
      organizationId,
      memberId: member.id,
    });
  };

  const handleRemoveMember = (member: Member) => {
    if (window.confirm(`${member.user.name || member.user.email} を組織から削除しますか？`)) {
      removeMemberMutation.mutate({
        organizationId,
        memberId: member.id,
      });
    }
  };

  const getUserInitials = (user: User) => {
    const name = user.name || user.email || "U";
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleColor = (roleName: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800", 
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
    ];
    const index = roleName.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const allSelected = members.length > 0 && selectedMembers.length === members.length;
  const someSelected = selectedMembers.length > 0 && selectedMembers.length < members.length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4">
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted animate-pulse rounded w-48" />
              <div className="h-3 bg-muted animate-pulse rounded w-32" />
            </div>
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">メンバーが見つかりません</h3>
        <p className="text-muted-foreground">
          条件に一致するメンバーがいません。フィルターを変更してみてください。
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>ユーザー</TableHead>
            <TableHead>ロール</TableHead>
            <TableHead>グループ</TableHead>
            <TableHead>権限</TableHead>
            <TableHead>参加日</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow 
              key={member.id}
              data-state={selectedMembers.includes(member.id) ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selectedMembers.includes(member.id)}
                  onCheckedChange={(checked) => 
                    handleSelectMember(member.id, checked as boolean)
                  }
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(member.user)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{member.user.name || "名前未設定"}</div>
                    <div className="text-sm text-muted-foreground">
                      {member.user.email}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {member.roles.length > 0 ? (
                    member.roles.map((role) => (
                      <Badge
                        key={role.id}
                        variant="secondary"
                        className={getRoleColor(role.name)}
                      >
                        {role.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">なし</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {member.groups.length > 0 ? (
                    member.groups.map((group) => (
                      <Badge key={group.id} variant="outline">
                        {group.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">なし</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  {member.isAdmin ? (
                    <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                      <Crown className="mr-1 h-3 w-3" />
                      管理者
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <User className="mr-1 h-3 w-3" />
                      メンバー
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {new Date(member.createdAt).toLocaleDateString("ja-JP")}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setEditingMember(member)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      編集
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleAdmin(member)}
                      disabled={toggleAdminMutation.isPending}
                    >
                      {member.isAdmin ? (
                        <>
                          <ShieldOff className="mr-2 h-4 w-4" />
                          管理者権限を剥奪
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          管理者権限を付与
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleRemoveMember(member)}
                      disabled={removeMemberMutation.isPending}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      組織から削除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 編集モーダル */}
      {editingMember && (
        <MemberEditModal
          organizationId={organizationId}
          member={editingMember}
          isOpen={!!editingMember}
          onClose={() => setEditingMember(null)}
          onMemberUpdated={onMemberUpdated}
        />
      )}
    </>
  );
};