"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";
import { ResourceType, PermissionAction } from "@tumiki/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/utils/client/toast";
import { ResourcePermissionSettings } from "@/components/access-control/ResourcePermissionSettings";
import { AccessControlMatrix } from "@/components/access-control/AccessControlMatrix";
import { PermissionTester } from "@/components/access-control/PermissionTester";
import { getResourceTypeDisplayName } from "@/lib/resourcePermissions";

const AccessControlPage: React.FC = () => {
  const params = useParams();
  const organizationId = params.id as string;
  const [selectedResourceType, setSelectedResourceType] = useState<ResourceType>(ResourceType.MCP_SERVER_CONFIG);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");

  // 組織の基本情報を取得
  const { data: organizations } = api.organization.getUserOrganizations.useQuery();
  const currentOrganization = organizations?.find(org => org.id === organizationId);

  // 選択されたリソースのアクセス制御ルールを取得
  const { 
    data: accessRules, 
    isLoading: isLoadingRules,
    refetch: refetchRules 
  } = api.resourceAccessControl.getByResource.useQuery(
    {
      organizationId,
      resourceType: selectedResourceType,
      resourceId: selectedResourceId,
    },
    {
      enabled: !!selectedResourceId,
    }
  );

  const handleResourceSelect = (resourceType: ResourceType, resourceId: string) => {
    setSelectedResourceType(resourceType);
    setSelectedResourceId(resourceId);
  };

  if (!currentOrganization) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>組織が見つかりません</CardTitle>
            <CardDescription>
              指定された組織にアクセスする権限がありません。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">アクセス制御管理</h1>
          <p className="text-muted-foreground">
            {currentOrganization.name} の リソースアクセス権限を管理します
          </p>
        </div>
        <Badge variant="outline">組織ID: {organizationId}</Badge>
      </div>

      <Tabs defaultValue="permissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="permissions">権限設定</TabsTrigger>
          <TabsTrigger value="matrix">権限マトリックス</TabsTrigger>
          <TabsTrigger value="tester">権限テスト</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>リソース権限設定</CardTitle>
              <CardDescription>
                特定のリソースに対する詳細なアクセス権限を設定できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResourcePermissionSettings
                organizationId={organizationId}
                selectedResourceType={selectedResourceType}
                selectedResourceId={selectedResourceId}
                accessRules={accessRules}
                isLoading={isLoadingRules}
                onResourceSelect={handleResourceSelect}
                onRulesUpdate={refetchRules}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>アクセス制御マトリックス</CardTitle>
              <CardDescription>
                組織全体の権限状況を一覧で確認できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccessControlMatrix
                organizationId={organizationId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tester" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>権限テストツール</CardTitle>
              <CardDescription>
                特定のユーザーが特定のリソースに対してどのような権限を持っているかテストできます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionTester
                organizationId={organizationId}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccessControlPage;