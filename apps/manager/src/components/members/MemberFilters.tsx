"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/trpc/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X, Users, Crown } from "lucide-react";

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

interface MemberFilters {
  search: string;
  roles: string[];
  groups: string[];
  isAdmin?: boolean;
}

interface MemberFiltersProps {
  organizationId: string;
  filters: MemberFilters;
  onFiltersChange: (filters: MemberFilters) => void;
}

export const MemberFilters = ({
  organizationId,
  filters,
  onFiltersChange,
}: MemberFiltersProps) => {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // 組織のロール一覧取得（仮想的 - 実際にはorganizationRoleルーターが必要）
  const { data: roles } = trpc.organizationRole?.getByOrganization?.useQuery?.({
    organizationId,
  }) || { data: [] };

  // 組織のグループ一覧取得（仮想的 - 実際にはorganizationGroupルーターが必要）
  const { data: groups } = trpc.organizationGroup?.getByOrganization?.useQuery?.({
    organizationId,
  }) || { data: [] };

  // デバウンス検索
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: localSearch,
      });
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [localSearch]);

  // 外部からのfilters変更を反映
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleRoleToggle = (roleId: string) => {
    const newRoles = filters.roles.includes(roleId)
      ? filters.roles.filter(id => id !== roleId)
      : [...filters.roles, roleId];
    
    onFiltersChange({
      ...filters,
      roles: newRoles,
    });
  };

  const handleGroupToggle = (groupId: string) => {
    const newGroups = filters.groups.includes(groupId)
      ? filters.groups.filter(id => id !== groupId)
      : [...filters.groups, groupId];
    
    onFiltersChange({
      ...filters,
      groups: newGroups,
    });
  };

  const handleAdminFilterChange = (value: string) => {
    let isAdmin: boolean | undefined;
    if (value === "admin") {
      isAdmin = true;
    } else if (value === "member") {
      isAdmin = false;
    } else {
      isAdmin = undefined;
    }

    onFiltersChange({
      ...filters,
      isAdmin,
    });
  };

  const handleClearFilters = () => {
    setLocalSearch("");
    onFiltersChange({
      search: "",
      roles: [],
      groups: [],
      isAdmin: undefined,
    });
  };

  const hasActiveFilters = 
    filters.search || 
    filters.roles.length > 0 || 
    filters.groups.length > 0 || 
    filters.isAdmin !== undefined;

  const getAdminFilterValue = () => {
    if (filters.isAdmin === true) return "admin";
    if (filters.isAdmin === false) return "member";
    return "all";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 検索 */}
        <div className="space-y-2">
          <Label htmlFor="search">検索</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="名前やメールアドレスで検索..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 管理者権限フィルタ */}
        <div className="space-y-2">
          <Label>権限</Label>
          <Select
            value={getAdminFilterValue()}
            onValueChange={handleAdminFilterChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="権限で絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="admin">管理者のみ</SelectItem>
              <SelectItem value="member">メンバーのみ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* アクション */}
        <div className="space-y-2">
          <Label>アクション</Label>
          <div className="flex space-x-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                クリア
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ロール・グループフィルタ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ロールフィルタ */}
        {roles && roles.length > 0 && (
          <div className="space-y-2">
            <Label>ロール</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Filter className="mr-2 h-4 w-4" />
                  {filters.roles.length > 0 
                    ? `${filters.roles.length} 個選択中`
                    : "ロールで絞り込み"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">ロールを選択</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={filters.roles.includes(role.id)}
                          onCheckedChange={() => handleRoleToggle(role.id)}
                        />
                        <label
                          htmlFor={`role-${role.id}`}
                          className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {role.name}
                          {role.description && (
                            <div className="text-xs text-muted-foreground">
                              {role.description}
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* グループフィルタ */}
        {groups && groups.length > 0 && (
          <div className="space-y-2">
            <Label>グループ</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  {filters.groups.length > 0 
                    ? `${filters.groups.length} 個選択中`
                    : "グループで絞り込み"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">グループを選択</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {groups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={filters.groups.includes(group.id)}
                          onCheckedChange={() => handleGroupToggle(group.id)}
                        />
                        <label
                          htmlFor={`group-${group.id}`}
                          className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {group.name}
                          {group.description && (
                            <div className="text-xs text-muted-foreground">
                              {group.description}
                            </div>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* アクティブフィルタ表示 */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary">
              検索: {filters.search}
              <X 
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => {
                  setLocalSearch("");
                  onFiltersChange({ ...filters, search: "" });
                }}
              />
            </Badge>
          )}
          
          {filters.isAdmin === true && (
            <Badge variant="default" className="bg-yellow-100 text-yellow-800">
              <Crown className="mr-1 h-3 w-3" />
              管理者
              <X 
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => handleAdminFilterChange("all")}
              />
            </Badge>
          )}
          
          {filters.isAdmin === false && (
            <Badge variant="outline">
              <Users className="mr-1 h-3 w-3" />
              メンバー
              <X 
                className="ml-1 h-3 w-3 cursor-pointer"
                onClick={() => handleAdminFilterChange("all")}
              />
            </Badge>
          )}

          {filters.roles.map((roleId) => {
            const role = roles?.find(r => r.id === roleId);
            return role ? (
              <Badge key={roleId} variant="secondary">
                ロール: {role.name}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => handleRoleToggle(roleId)}
                />
              </Badge>
            ) : null;
          })}

          {filters.groups.map((groupId) => {
            const group = groups?.find(g => g.id === groupId);
            return group ? (
              <Badge key={groupId} variant="outline">
                グループ: {group.name}
                <X 
                  className="ml-1 h-3 w-3 cursor-pointer"
                  onClick={() => handleGroupToggle(groupId)}
                />
              </Badge>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};