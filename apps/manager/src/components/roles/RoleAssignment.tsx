"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus, Users } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";

type RoleData = RouterOutputs["organizationRole"]["getByOrganization"][0];
type MemberData = {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  isAdmin: boolean;
  roles: Array<{ id: string; name: string }>;
};

type GroupData = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  roles: Array<{ id: string; name: string }>;
};

interface RoleAssignmentProps {
  role: RoleData;
  organizationId: string;
  onAssignmentChange?: () => void;
}

export const RoleAssignment = ({ role, organizationId, onAssignmentChange }: RoleAssignmentProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  // 組織のメンバー一覧を取得（実際のクエリが実装されるまでモックデータを使用）
  // const { data: members = [], refetch: refetchMembers } = trpc.organization.getMembers?.useQuery(
  //   { organizationId },
  //   { enabled: false } // 実際のクエリが実装されるまで無効化
  // ) || { data: [], refetch: () => {} };

  // 組織のグループ一覧を取得（実際のクエリが実装されるまでモックデータを使用）
  // const { data: groups = [], refetch: refetchGroups } = trpc.organization.getGroups?.useQuery(
  //   { organizationId },
  //   { enabled: false } // 実際のクエリが実装されるまで無効化
  // ) || { data: [], refetch: () => {} };

  // モックデータ（実際の実装では削除）
  const mockMembers: MemberData[] = [
    {
      id: "1",
      user: {
        id: "1",
        name: "田中太郎",
        email: "tanaka@example.com",
        image: null,
      },
      isAdmin: true,
      roles: [{ id: "role1", name: "管理者" }],
    },
    {
      id: "2", 
      user: {
        id: "2",
        name: "佐藤花子",
        email: "sato@example.com",
        image: null,
      },
      isAdmin: false,
      roles: [{ id: role.id, name: role.name }],
    },
  ];

  const mockGroups: GroupData[] = [
    {
      id: "1",
      name: "開発チーム",
      description: "アプリケーション開発を担当するチーム",
      memberCount: 5,
      roles: [{ id: role.id, name: role.name }],
    },
    {
      id: "2",
      name: "マーケティングチーム", 
      description: "マーケティング活動を担当するチーム",
      memberCount: 3,
      roles: [],
    },
  ];

  // 実際のデータまたはモックデータを使用（現在はモックデータのみ）
  const displayMembers = mockMembers; // members.length > 0 ? members : mockMembers;
  const displayGroups = mockGroups; // groups.length > 0 ? groups : mockGroups;

  // メンバーにロールを割り当て/削除（実際のmutationに置き換える必要があります）
  const assignRoleToMemberMutation = {
    mutate: ({ memberId, assign }: { memberId: string; assign: boolean }) => {
      toast.success(assign ? "ロールを割り当てました" : "ロール割り当てを解除しました");
      onAssignmentChange?.();
    },
  };

  // グループにロールを割り当て/削除（実際のmutationに置き換える必要があります）
  const assignRoleToGroupMutation = {
    mutate: ({ groupId, assign }: { groupId: string; assign: boolean }) => {
      toast.success(assign ? "ロールを割り当てました" : "ロール割り当てを解除しました");
      onAssignmentChange?.();
    },
  };

  // メンバーの検索フィルタリング
  const filteredMembers = displayMembers.filter(member =>
    member.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // グループの検索フィルタリング
  const filteredGroups = displayGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // メンバーがこのロールを持っているかチェック
  const memberHasRole = (member: MemberData): boolean => {
    return member.roles.some(r => r.id === role.id);
  };

  // グループがこのロールを持っているかチェック
  const groupHasRole = (group: GroupData): boolean => {
    return group.roles.some(r => r.id === role.id);
  };

  // メンバーのロール割り当てトグル
  const handleMemberRoleToggle = (memberId: string, assign: boolean) => {
    assignRoleToMemberMutation.mutate({ memberId, assign });
  };

  // グループのロール割り当てトグル
  const handleGroupRoleToggle = (groupId: string, assign: boolean) => {
    assignRoleToGroupMutation.mutate({ groupId, assign });
  };

  // 一括割り当て
  const handleBulkAssignMembers = () => {
    selectedMembers.forEach(memberId => {
      const member = displayMembers.find(m => m.id === memberId);
      if (member && !memberHasRole(member)) {
        assignRoleToMemberMutation.mutate({ memberId, assign: true });
      }
    });
    setSelectedMembers(new Set());
  };

  const handleBulkAssignGroups = () => {
    selectedGroups.forEach(groupId => {
      const group = displayGroups.find(g => g.id === groupId);
      if (group && !groupHasRole(group)) {
        assignRoleToGroupMutation.mutate({ groupId, assign: true });
      }
    });
    setSelectedGroups(new Set());
  };

  const assignedMembers = displayMembers.filter(memberHasRole);
  const assignedGroups = displayGroups.filter(groupHasRole);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>ロール割り当て: {role.name}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              メンバー: {assignedMembers.length}
            </Badge>
            <Badge variant="secondary">
              グループ: {assignedGroups.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members" className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>メンバー</span>
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>グループ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            {/* 検索とアクション */}
            <div className="flex items-center justify-between space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="メンバーを検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              {selectedMembers.size > 0 && (
                <Button onClick={handleBulkAssignMembers}>
                  選択したメンバーに割り当て ({selectedMembers.size})
                </Button>
              )}
            </div>

            {/* メンバー一覧 */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedMembers.size === filteredMembers.length && filteredMembers.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMembers(new Set(filteredMembers.map(m => m.id)));
                        } else {
                          setSelectedMembers(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>メンバー</TableHead>
                  <TableHead>現在のロール</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-center">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const hasRole = memberHasRole(member);
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedMembers.has(member.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedMembers);
                            if (checked) {
                              newSelected.add(member.id);
                            } else {
                              newSelected.delete(member.id);
                            }
                            setSelectedMembers(newSelected);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.user.image || undefined} />
                            <AvatarFallback>
                              {member.user.name?.charAt(0) || member.user.email?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.user.name || "名前未設定"}</div>
                            <div className="text-sm text-muted-foreground">{member.user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.isAdmin && (
                            <Badge variant="destructive">管理者</Badge>
                          )}
                          {member.roles.map((roleItem) => (
                            <Badge key={roleItem.id} variant="outline">
                              {roleItem.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasRole ? (
                          <Badge variant="default">割り当て済み</Badge>
                        ) : (
                          <Badge variant="secondary">未割り当て</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant={hasRole ? "destructive" : "default"}
                          onClick={() => handleMemberRoleToggle(member.id, !hasRole)}
                        >
                          {hasRole ? "解除" : "割り当て"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            {/* 検索とアクション */}
            <div className="flex items-center justify-between space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="グループを検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              {selectedGroups.size > 0 && (
                <Button onClick={handleBulkAssignGroups}>
                  選択したグループに割り当て ({selectedGroups.size})
                </Button>
              )}
            </div>

            {/* グループ一覧 */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedGroups.size === filteredGroups.length && filteredGroups.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGroups(new Set(filteredGroups.map(g => g.id)));
                        } else {
                          setSelectedGroups(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>グループ</TableHead>
                  <TableHead>現在のロール</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-center">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => {
                  const hasRole = groupHasRole(group);
                  return (
                    <TableRow key={group.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedGroups.has(group.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedGroups);
                            if (checked) {
                              newSelected.add(group.id);
                            } else {
                              newSelected.delete(group.id);
                            }
                            setSelectedGroups(newSelected);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{group.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {group.description || "説明なし"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            メンバー数: {group.memberCount}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {group.roles.map((roleItem) => (
                            <Badge key={roleItem.id} variant="outline">
                              {roleItem.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasRole ? (
                          <Badge variant="default">割り当て済み</Badge>
                        ) : (
                          <Badge variant="secondary">未割り当て</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant={hasRole ? "destructive" : "default"}
                          onClick={() => handleGroupRoleToggle(group.id, !hasRole)}
                        >
                          {hasRole ? "解除" : "割り当て"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};