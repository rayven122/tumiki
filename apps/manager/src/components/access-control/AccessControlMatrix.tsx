"use client";

import React, { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import { ResourceType, PermissionAction } from "@tumiki/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users, Shield, AlertTriangle } from "lucide-react";
import { 
  getResourceTypeDisplayName, 
  getActionDisplayName,
  getAvailableActions,
  generatePermissionMatrix
} from "@/lib/resourcePermissions";

interface AccessControlMatrixProps {
  organizationId: string;
}

export const AccessControlMatrix: React.FC<AccessControlMatrixProps> = ({
  organizationId,
}) => {
  const [selectedResourceTypes, setSelectedResourceTypes] = useState<ResourceType[]>([
    ResourceType.MCP_SERVER_CONFIG,
    ResourceType.TOOL_GROUP,
  ]);
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview");

  // 組織のメンバーとグループを取得（実際のAPIがあれば使用）
  // const { data: members } = api.organization.getMembers.useQuery({ organizationId });
  // const { data: groups } = api.organization.getGroups.useQuery({ organizationId });

  // モックデータ（実装時は実際のAPIデータに置き換え）
  const mockMembers = [
    { id: "member1", name: "田中太郎", email: "tanaka@example.com", isAdmin: false },
    { id: "member2", name: "佐藤花子", email: "sato@example.com", isAdmin: true },
    { id: "member3", name: "鈴木一郎", email: "suzuki@example.com", isAdmin: false },
  ];

  const mockGroups = [
    { id: "group1", name: "開発チーム", description: "システム開発担当" },
    { id: "group2", name: "管理者", description: "システム管理者" },
  ];

  // 権限マトリックスデータを生成
  const permissionMatrix = useMemo(() => {
    const subjects = [
      ...mockMembers.map(member => ({ 
        id: member.id, 
        name: member.name, 
        type: 'member' as const,
        isAdmin: member.isAdmin 
      })),
      ...mockGroups.map(group => ({ 
        id: group.id, 
        name: group.name, 
        type: 'group' as const,
        isAdmin: false 
      })),
    ];

    return generatePermissionMatrix(subjects, selectedResourceTypes);
  }, [selectedResourceTypes, mockMembers, mockGroups]);

  const handleResourceTypeToggle = (resourceType: ResourceType) => {
    setSelectedResourceTypes(prev => 
      prev.includes(resourceType)
        ? prev.filter(type => type !== resourceType)
        : [...prev, resourceType]
    );
  };

  const getPermissionStatus = (
    subjectId: string, 
    resourceType: ResourceType, 
    action: PermissionAction
  ): "granted" | "denied" | "inherited" | "none" => {
    // 実際の実装では、ここでAPIからの権限データを使用
    // モックとして基本的なロジックを実装
    const subject = [...mockMembers, ...mockGroups].find(s => s.id === subjectId);
    if (!subject) return "none";

    // 管理者は全権限を持つ
    if ('isAdmin' in subject && subject.isAdmin) return "granted";

    // その他はランダムに設定（デモ用）
    const hash = `${subjectId}-${resourceType}-${action}`;
    const score = hash.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    if (score % 4 === 0) return "granted";
    if (score % 4 === 1) return "denied";
    if (score % 4 === 2) return "inherited";
    return "none";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "granted":
        return <div className="w-3 h-3 bg-green-500 rounded-full" />;
      case "denied":
        return <div className="w-3 h-3 bg-red-500 rounded-full" />;
      case "inherited":
        return <div className="w-3 h-3 bg-blue-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-300 rounded-full" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "granted":
        return <Badge className="bg-green-100 text-green-800">許可</Badge>;
      case "denied":
        return <Badge className="bg-red-100 text-red-800">拒否</Badge>;
      case "inherited":
        return <Badge className="bg-blue-100 text-blue-800">継承</Badge>;
      default:
        return <Badge variant="outline">なし</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 設定パネル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>マトリックス表示設定</span>
          </CardTitle>
          <CardDescription>
            表示するリソースタイプと表示形式を選択してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">表示するリソースタイプ</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(ResourceType).map((resourceType) => (
                <div key={resourceType} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedResourceTypes.includes(resourceType)}
                    onCheckedChange={() => handleResourceTypeToggle(resourceType)}
                  />
                  <label className="text-sm">
                    {getResourceTypeDisplayName(resourceType)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">表示モード</label>
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as "overview" | "detailed")}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">概要表示</SelectItem>
                <SelectItem value="detailed">詳細表示</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 権限マトリックス */}
      <Card>
        <CardHeader>
          <CardTitle>アクセス権限マトリックス</CardTitle>
          <CardDescription>
            組織内のメンバーとグループの権限状況を一覧表示します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "overview" | "detailed")}>
            <TabsList>
              <TabsTrigger value="overview">概要表示</TabsTrigger>
              <TabsTrigger value="detailed">詳細表示</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">対象</TableHead>
                      {selectedResourceTypes.map((resourceType) => (
                        <TableHead key={resourceType} className="text-center">
                          {getResourceTypeDisplayName(resourceType)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissionMatrix.map((subject) => (
                      <TableRow key={subject.subjectId}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {subject.subjectType === "member" ? (
                              <User className="w-4 h-4" />
                            ) : (
                              <Users className="w-4 h-4" />
                            )}
                            <span className="font-medium">{subject.subjectName}</span>
                            <Badge variant="outline">
                              {subject.subjectType === "member" ? "メンバー" : "グループ"}
                            </Badge>
                          </div>
                        </TableCell>
                        {selectedResourceTypes.map((resourceType) => {
                          const hasAnyPermission = getAvailableActions(resourceType).some(action =>
                            getPermissionStatus(subject.subjectId, resourceType, action) === "granted"
                          );
                          return (
                            <TableCell key={resourceType} className="text-center">
                              {getStatusIcon(hasAnyPermission ? "granted" : "none")}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="detailed" className="mt-6">
              <div className="space-y-6">
                {selectedResourceTypes.map((resourceType) => (
                  <Card key={resourceType}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {getResourceTypeDisplayName(resourceType)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-48">対象</TableHead>
                              {getAvailableActions(resourceType).map((action) => (
                                <TableHead key={action} className="text-center min-w-20">
                                  {getActionDisplayName(action)}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {permissionMatrix.map((subject) => (
                              <TableRow key={subject.subjectId}>
                                <TableCell>
                                  <div className="flex items-center space-x-2">
                                    {subject.subjectType === "member" ? (
                                      <User className="w-4 h-4" />
                                    ) : (
                                      <Users className="w-4 h-4" />
                                    )}
                                    <span className="font-medium text-sm">{subject.subjectName}</span>
                                  </div>
                                </TableCell>
                                {getAvailableActions(resourceType).map((action) => {
                                  const status = getPermissionStatus(
                                    subject.subjectId, 
                                    resourceType, 
                                    action
                                  );
                                  return (
                                    <TableCell key={action} className="text-center">
                                      {getStatusBadge(status)}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 凡例 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">凡例</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span>明示的に許可</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span>明示的に拒否</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span>ロールから継承</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-300 rounded-full" />
                <span>権限なし</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};