"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@tumiki/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { RoleList } from "./RoleList";
import { CreateRoleDialog } from "./CreateRoleDialog";

export const RoleManagement = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ロール管理</h1>
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
  );
};
