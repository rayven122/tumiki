"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@tumiki/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { EEFeatureGate, EEUpgradePrompt } from "@/components/ee";
import { RoleList } from "./roles/RoleList";
import { CreateRoleDialog } from "./roles/CreateRoleDialog";

export const RolesTab = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <EEFeatureGate
      feature="role-management"
      fallback={<EEUpgradePrompt feature="role-management" />}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            ロール作成
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>カスタムロール一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleList />
          </CardContent>
        </Card>

        <CreateRoleDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      </div>
    </EEFeatureGate>
  );
};
