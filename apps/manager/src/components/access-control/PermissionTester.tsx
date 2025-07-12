"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { ResourceType, PermissionAction } from "@tumiki/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  Shield, 
  Search,
  Clock,
  Info
} from "lucide-react";
import { toast } from "@/utils/client/toast";
import { 
  getResourceTypeDisplayName, 
  getActionDisplayName,
  getAvailableActions
} from "@/lib/resourcePermissions";

interface PermissionTesterProps {
  organizationId: string;
}

interface TestResult {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  hasAccess: boolean;
  reason: string;
  details: {
    isAdmin: boolean;
    explicitRules: any[];
    rolePermissions: any[];
    allowRule?: any;
    denyRule?: any;
  };
}

export const PermissionTester: React.FC<PermissionTesterProps> = ({
  organizationId,
}) => {
  const [testConfig, setTestConfig] = useState({
    userId: "",
    resourceType: ResourceType.MCP_SERVER_CONFIG,
    resourceId: "",
    action: PermissionAction.READ,
  });

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<Array<{
    config: typeof testConfig;
    result: TestResult;
    timestamp: Date;
  }>>([]);

  // 権限テストAPI
  const testPermissionMutation = api.resourceAccessControl.testPermission.useMutation({
    onSuccess: (result) => {
      setTestResult(result);
      setTestHistory(prev => [{
        config: { ...testConfig },
        result,
        timestamp: new Date(),
      }, ...prev.slice(0, 9)]); // 最新10件を保持

      toast.success(`権限テスト完了: ${result.hasAccess ? "アクセス許可" : "アクセス拒否"}`);
    },
    onError: (error) => {
      toast.error(`テストエラー: ${error.message}`);
    },
  });

  const handleTest = () => {
    if (!testConfig.userId || !testConfig.resourceId) {
      toast.error("入力エラー: ユーザーIDとリソースIDを入力してください");
      return;
    }

    testPermissionMutation.mutate({
      organizationId,
      userId: testConfig.userId,
      resourceType: testConfig.resourceType,
      resourceId: testConfig.resourceId,
      action: testConfig.action,
    });
  };

  const getResultIcon = (hasAccess: boolean) => {
    return hasAccess ? (
      <CheckCircle className="w-6 h-6 text-green-500" />
    ) : (
      <XCircle className="w-6 h-6 text-red-500" />
    );
  };

  const getReasonColor = (reason: string) => {
    if (reason.includes("管理者")) return "text-blue-600";
    if (reason.includes("拒否")) return "text-red-600";
    if (reason.includes("許可")) return "text-green-600";
    if (reason.includes("ロール")) return "text-purple-600";
    return "text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* テスト設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>権限テスト設定</span>
          </CardTitle>
          <CardDescription>
            特定のユーザーが特定のリソースに対してどのような権限を持っているかテストします。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ユーザーID</Label>
              <Input
                value={testConfig.userId}
                onChange={(e) => setTestConfig({ ...testConfig, userId: e.target.value })}
                placeholder="テスト対象のユーザーIDを入力"
              />
            </div>
            <div className="space-y-2">
              <Label>リソースID</Label>
              <Input
                value={testConfig.resourceId}
                onChange={(e) => setTestConfig({ ...testConfig, resourceId: e.target.value })}
                placeholder="対象リソースのIDを入力"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>リソースタイプ</Label>
              <Select
                value={testConfig.resourceType}
                onValueChange={(value) => setTestConfig({ 
                  ...testConfig, 
                  resourceType: value as ResourceType,
                  action: getAvailableActions(value as ResourceType)[0] // 最初のアクションを設定
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ResourceType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {getResourceTypeDisplayName(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>アクション</Label>
              <Select
                value={testConfig.action}
                onValueChange={(value) => setTestConfig({ ...testConfig, action: value as PermissionAction })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableActions(testConfig.resourceType).map((action) => (
                    <SelectItem key={action} value={action}>
                      {getActionDisplayName(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleTest}
            disabled={testPermissionMutation.isPending || !testConfig.userId || !testConfig.resourceId}
            className="w-full"
          >
            {testPermissionMutation.isPending ? "テスト中..." : "権限をテスト"}
          </Button>
        </CardContent>
      </Card>

      {/* テスト結果 */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getResultIcon(testResult.hasAccess)}
              <span>テスト結果</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ユーザー情報 */}
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <User className="w-5 h-5" />
              <div>
                <div className="font-medium">{testResult.user.name || "名前なし"}</div>
                <div className="text-sm text-muted-foreground">{testResult.user.email}</div>
              </div>
            </div>

            {/* 結果概要 */}
            <Alert className={testResult.hasAccess ? "border-green-200" : "border-red-200"}>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {testResult.hasAccess ? "アクセス許可" : "アクセス拒否"}
                  </span>
                  <Badge 
                    variant={testResult.hasAccess ? "default" : "destructive"}
                    className={testResult.hasAccess ? "bg-green-100 text-green-800" : ""}
                  >
                    {testResult.hasAccess ? "ALLOW" : "DENY"}
                  </Badge>
                </div>
                <div className={`mt-2 text-sm ${getReasonColor(testResult.reason)}`}>
                  理由: {testResult.reason}
                </div>
              </AlertDescription>
            </Alert>

            {/* 詳細情報 */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">詳細情報</h4>
              
              {testResult.details.isAdmin && (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    このユーザーは組織の管理者権限を持っています。
                  </AlertDescription>
                </Alert>
              )}

              {testResult.details.denyRule && (
                <Card className="border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-600">拒否ルール</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm">
                      {testResult.details.denyRule.member && (
                        <div>メンバー: {testResult.details.denyRule.member.user.name}</div>
                      )}
                      {testResult.details.denyRule.group && (
                        <div>グループ: {testResult.details.denyRule.group.name}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {testResult.details.allowRule && (
                <Card className="border-green-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-600">許可ルール</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm">
                      {testResult.details.allowRule.member && (
                        <div>メンバー: {testResult.details.allowRule.member.user.name}</div>
                      )}
                      {testResult.details.allowRule.group && (
                        <div>グループ: {testResult.details.allowRule.group.name}</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {testResult.details.rolePermissions.length > 0 && (
                <Card className="border-purple-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-purple-600">ロール権限</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {testResult.details.rolePermissions.map((permission, index) => (
                        <div key={index} className="text-sm">
                          ロール「{permission.roleName}」から {getActionDisplayName(permission.action)} 権限
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {testResult.details.explicitRules.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">関連するアクセス制御ルール</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-muted-foreground">
                      {testResult.details.explicitRules.length} 件のルールが見つかりました
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* テスト履歴 */}
      {testHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>テスト履歴</span>
            </CardTitle>
            <CardDescription>
              最近実行したテストの履歴を表示します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testHistory.map((historyItem, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setTestConfig(historyItem.config)}
                >
                  <div className="flex items-center space-x-3">
                    {getResultIcon(historyItem.result.hasAccess)}
                    <div>
                      <div className="text-sm font-medium">
                        {historyItem.result.user.name} - {getResourceTypeDisplayName(historyItem.config.resourceType)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getActionDisplayName(historyItem.config.action)} | {historyItem.config.resourceId}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {historyItem.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};