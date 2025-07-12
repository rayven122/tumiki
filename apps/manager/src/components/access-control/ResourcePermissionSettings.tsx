"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { ResourceType, PermissionAction, type ResourceAccessControl } from "@tumiki/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Edit, User, Users } from "lucide-react";
import { toast } from "@/utils/client/toast";
import { 
  getResourceTypeDisplayName, 
  getActionDisplayName, 
  getAvailableActions,
  validatePermissionCombination 
} from "@/lib/resourcePermissions";

interface ResourcePermissionSettingsProps {
  organizationId: string;
  selectedResourceType: ResourceType;
  selectedResourceId: string;
  accessRules?: ResourceAccessControl[];
  isLoading: boolean;
  onResourceSelect: (resourceType: ResourceType, resourceId: string) => void;
  onRulesUpdate: () => void;
}

export const ResourcePermissionSettings: React.FC<ResourcePermissionSettingsProps> = ({
  organizationId,
  selectedResourceType,
  selectedResourceId,
  accessRules = [],
  isLoading,
  onResourceSelect,
  onRulesUpdate,
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ResourceAccessControl | null>(null);

  // 新規ルール作成用の状態
  const [newRule, setNewRule] = useState({
    resourceType: ResourceType.MCP_SERVER_CONFIG,
    resourceId: "",
    subjectType: "member" as "member" | "group",
    subjectId: "",
    allowedActions: [] as PermissionAction[],
    deniedActions: [] as PermissionAction[],
  });

  // API mutations
  const createRuleMutation = api.resourceAccessControl.createRule.useMutation({
    onSuccess: () => {
      toast.success("アクセス制御ルールを作成しました");
      setIsCreateDialogOpen(false);
      resetNewRule();
      onRulesUpdate();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const updateRuleMutation = api.resourceAccessControl.updateRule.useMutation({
    onSuccess: () => {
      toast.success("アクセス制御ルールを更新しました");
      setEditingRule(null);
      onRulesUpdate();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const deleteRuleMutation = api.resourceAccessControl.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("アクセス制御ルールを削除しました");
      onRulesUpdate();
    },
    onError: (error) => {
      toast.error(`エラー: ${error.message}`);
    },
  });

  const resetNewRule = () => {
    setNewRule({
      resourceType: ResourceType.MCP_SERVER_CONFIG,
      resourceId: "",
      subjectType: "member",
      subjectId: "",
      allowedActions: [],
      deniedActions: [],
    });
  };

  const handleCreateRule = () => {
    const validation = validatePermissionCombination(
      newRule.allowedActions,
      newRule.deniedActions
    );

    if (!validation.isValid) {
      toast.error(`権限の競合: 以下のアクションが許可と拒否の両方に設定されています: ${validation.conflicts.map(getActionDisplayName).join(", ")}`);
      return;
    }

    createRuleMutation.mutate({
      organizationId,
      resourceType: newRule.resourceType,
      resourceId: newRule.resourceId,
      memberId: newRule.subjectType === "member" ? newRule.subjectId : undefined,
      groupId: newRule.subjectType === "group" ? newRule.subjectId : undefined,
      allowedActions: newRule.allowedActions,
      deniedActions: newRule.deniedActions,
    });
  };

  const handleUpdateRule = (rule: ResourceAccessControl) => {
    if (!editingRule) return;

    updateRuleMutation.mutate({
      id: rule.id,
      allowedActions: editingRule.allowedActions,
      deniedActions: editingRule.deniedActions,
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm("このアクセス制御ルールを削除しますか？")) {
      deleteRuleMutation.mutate({ id: ruleId });
    }
  };

  const handleActionToggle = (
    action: PermissionAction,
    type: "allowed" | "denied",
    isRule = false
  ) => {
    if (isRule && editingRule) {
      const currentActions = type === "allowed" ? editingRule.allowedActions : editingRule.deniedActions;
      const otherActions = type === "allowed" ? editingRule.deniedActions : editingRule.allowedActions;
      
      const newActions = currentActions.includes(action)
        ? currentActions.filter(a => a !== action)
        : [...currentActions, action];

      setEditingRule({
        ...editingRule,
        [type === "allowed" ? "allowedActions" : "deniedActions"]: newActions,
      });
    } else {
      const currentActions = type === "allowed" ? newRule.allowedActions : newRule.deniedActions;
      const newActions = currentActions.includes(action)
        ? currentActions.filter(a => a !== action)
        : [...currentActions, action];

      setNewRule({
        ...newRule,
        [type === "allowed" ? "allowedActions" : "deniedActions"]: newActions,
      });
    }
  };

  const availableActions = getAvailableActions(selectedResourceType);

  return (
    <div className="space-y-6">
      {/* リソース選択 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>リソースタイプ</Label>
          <Select
            value={selectedResourceType}
            onValueChange={(value) => onResourceSelect(value as ResourceType, "")}
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
          <Label>リソースID</Label>
          <Input
            value={selectedResourceId}
            onChange={(e) => onResourceSelect(selectedResourceType, e.target.value)}
            placeholder="リソースIDを入力"
          />
        </div>
      </div>

      {/* アクセス制御ルール一覧 */}
      {selectedResourceId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {getResourceTypeDisplayName(selectedResourceType)}のアクセス制御ルール
            </h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  ルール追加
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>新しいアクセス制御ルール</DialogTitle>
                  <DialogDescription>
                    リソースに対する新しいアクセス制御ルールを作成します。
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>対象タイプ</Label>
                      <Select
                        value={newRule.subjectType}
                        onValueChange={(value) => setNewRule({ ...newRule, subjectType: value as "member" | "group" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">メンバー</SelectItem>
                          <SelectItem value="group">グループ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{newRule.subjectType === "member" ? "メンバー" : "グループ"}ID</Label>
                      <Input
                        value={newRule.subjectId}
                        onChange={(e) => setNewRule({ ...newRule, subjectId: e.target.value })}
                        placeholder={`${newRule.subjectType === "member" ? "メンバー" : "グループ"}IDを入力`}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-green-600">許可するアクション</Label>
                      {availableActions.map((action) => (
                        <div key={action} className="flex items-center space-x-2">
                          <Checkbox
                            checked={newRule.allowedActions.includes(action)}
                            onCheckedChange={() => handleActionToggle(action, "allowed")}
                          />
                          <Label className="text-sm">{getActionDisplayName(action)}</Label>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <Label className="text-red-600">拒否するアクション</Label>
                      {availableActions.map((action) => (
                        <div key={action} className="flex items-center space-x-2">
                          <Checkbox
                            checked={newRule.deniedActions.includes(action)}
                            onCheckedChange={() => handleActionToggle(action, "denied")}
                          />
                          <Label className="text-sm">{getActionDisplayName(action)}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleCreateRule}
                    disabled={createRuleMutation.isPending || !newRule.subjectId}
                  >
                    作成
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : accessRules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                このリソースにはアクセス制御ルールがありません
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {accessRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {rule.member ? (
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{rule.member.user.name}</span>
                            <Badge variant="outline">メンバー</Badge>
                          </div>
                        ) : rule.group ? (
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">{rule.group.name}</span>
                            <Badge variant="outline">グループ</Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">全メンバー</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRule(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-green-600">許可</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.allowedActions.map((action) => (
                            <Badge key={action} variant="outline" className="text-green-600">
                              {getActionDisplayName(action)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-red-600">拒否</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.deniedActions.map((action) => (
                            <Badge key={action} variant="outline" className="text-red-600">
                              {getActionDisplayName(action)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 編集ダイアログ */}
          <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>アクセス制御ルールの編集</DialogTitle>
                <DialogDescription>
                  権限の設定を変更できます。
                </DialogDescription>
              </DialogHeader>
              
              {editingRule && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-green-600">許可するアクション</Label>
                      {availableActions.map((action) => (
                        <div key={action} className="flex items-center space-x-2">
                          <Checkbox
                            checked={editingRule.allowedActions.includes(action)}
                            onCheckedChange={() => handleActionToggle(action, "allowed", true)}
                          />
                          <Label className="text-sm">{getActionDisplayName(action)}</Label>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <Label className="text-red-600">拒否するアクション</Label>
                      {availableActions.map((action) => (
                        <div key={action} className="flex items-center space-x-2">
                          <Checkbox
                            checked={editingRule.deniedActions.includes(action)}
                            onCheckedChange={() => handleActionToggle(action, "denied", true)}
                          />
                          <Label className="text-sm">{getActionDisplayName(action)}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setEditingRule(null)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => editingRule && handleUpdateRule(editingRule)}
                  disabled={updateRuleMutation.isPending}
                >
                  更新
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};