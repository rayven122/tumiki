"use client";

import { Button } from "@tumiki/ui/button";
import { Crown, User } from "lucide-react";

type MemberFiltersProps = {
  roleFilter: "all" | "admin" | "member";
  onRoleFilterChange: (filter: "all" | "admin" | "member") => void;
};

export const MemberFilters = ({
  roleFilter,
  onRoleFilterChange,
}: MemberFiltersProps) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">表示:</span>
      <div className="flex gap-1">
        <Button
          variant={roleFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onRoleFilterChange("all")}
        >
          すべて
        </Button>
        <Button
          variant={roleFilter === "admin" ? "default" : "outline"}
          size="sm"
          onClick={() => onRoleFilterChange("admin")}
        >
          <Crown className="mr-1 h-3 w-3" />
          管理者
        </Button>
        <Button
          variant={roleFilter === "member" ? "default" : "outline"}
          size="sm"
          onClick={() => onRoleFilterChange("member")}
        >
          <User className="mr-1 h-3 w-3" />
          メンバー
        </Button>
      </div>
    </div>
  );
};
