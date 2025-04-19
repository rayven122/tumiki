"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircle2Icon,
  Edit2Icon,
  FilterIcon,
  MoreHorizontalIcon,
  SearchIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConnectModal } from "../plugins/_components/ConnectModal";
import { DeletePermissionDialog } from "./delete-permission-dialog";

const permissions = [
  {
    id: "1",
    name: "Slack通知送信",
    toolType: "Slack",
    expirationDate: "2025-12-31",
    status: "active",
    lastUpdated: "2024-04-01",
    connectionInfo: {
      client: "claude",
      apiKey: "sk-1234567890",
    },
  },
  {
    id: "2",
    name: "Notionページ編集",
    toolType: "Notion",
    expirationDate: "2025-06-30",
    status: "active",
    lastUpdated: "2024-03-15",
    connectionInfo: {
      client: "cursor",
      apiKey: "sk-0987654321",
    },
  },
  {
    id: "3",
    name: "GitHubリポジトリ閲覧",
    toolType: "GitHub",
    expirationDate: "2024-12-31",
    status: "active",
    lastUpdated: "2024-02-20",
    connectionInfo: {
      client: "windsurf",
      apiKey: "sk-1122334455",
    },
  },
  {
    id: "4",
    name: "Webスクレイピング",
    toolType: "Playwright",
    expirationDate: "2024-05-31",
    status: "inactive",
    lastUpdated: "2023-11-10",
    connectionInfo: {
      client: "cline",
      apiKey: "sk-5566778899",
    },
  },
  {
    id: "5",
    name: "Slackチャンネル管理",
    toolType: "Slack",
    expirationDate: "2025-09-30",
    status: "active",
    lastUpdated: "2024-01-05",
    connectionInfo: {
      client: "witsy",
      apiKey: "sk-9988776655",
    },
  },
];

export function PermissionsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [toolTypeFilter, setToolTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("lastUpdated");
  const [sortDirection, setSortDirection] = useState("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState<string | null>(
    null,
  );
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<string | null>(
    null,
  );

  // Filter and sort permissions
  const filteredPermissions = permissions
    .filter((permission) => {
      // Search filter
      if (
        searchQuery &&
        !permission.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Tool type filter
      if (toolTypeFilter !== "all" && permission.toolType !== toolTypeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && permission.status !== statusFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by selected field
      const fieldA = a[sortField as keyof typeof a];
      const fieldB = b[sortField as keyof typeof b];

      if (sortDirection === "asc") {
        return fieldA > fieldB ? 1 : -1;
      }
      return fieldA < fieldB ? 1 : -1;
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDeleteClick = (id: string) => {
    setPermissionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    // Handle delete logic here
    console.log(`Deleting permission ${permissionToDelete}`);
    setDeleteDialogOpen(false);
    setPermissionToDelete(null);
  };

  return (
    <Card>
      <div className="border-b p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-64">
            <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="権限名で検索..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FilterIcon className="text-muted-foreground h-4 w-4" />
              <Select value={toolTypeFilter} onValueChange={setToolTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="ツール種別" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全てのツール</SelectItem>
                  <SelectItem value="Slack">Slack</SelectItem>
                  <SelectItem value="Notion">Notion</SelectItem>
                  <SelectItem value="Playwright">Playwright</SelectItem>
                  <SelectItem value="GitHub">GitHub</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全てのステータス</SelectItem>
                <SelectItem value="active">有効</SelectItem>
                <SelectItem value="inactive">無効</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="w-[250px] cursor-pointer"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  権限名
                  {sortField === "name" &&
                    (sortDirection === "asc" ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("toolType")}
              >
                <div className="flex items-center gap-1">
                  ツール種別
                  {sortField === "toolType" &&
                    (sortDirection === "asc" ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("expirationDate")}
              >
                <div className="flex items-center gap-1">
                  有効期限
                  {sortField === "expirationDate" &&
                    (sortDirection === "asc" ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  ステータス
                  {sortField === "status" &&
                    (sortDirection === "asc" ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("lastUpdated")}
              >
                <div className="flex items-center gap-1">
                  最終更新日時
                  {sortField === "lastUpdated" &&
                    (sortDirection === "asc" ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead>接続情報</TableHead>
              <TableHead className="w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPermissions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-6 text-center"
                >
                  該当する権限がありません
                </TableCell>
              </TableRow>
            ) : (
              filteredPermissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell className="font-medium">
                    {permission.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {permission.toolType}
                    </Badge>
                  </TableCell>
                  <TableCell>{permission.expirationDate}</TableCell>
                  <TableCell>
                    {permission.status === "active" ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle2Icon className="h-4 w-4 text-green-500" />
                        <span>有効</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                        <span>無効</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{permission.lastUpdated}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPermission(permission.id);
                        setConnectModalOpen(true);
                      }}
                    >
                      接続情報を表示
                    </Button>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontalIcon className="h-4 w-4" />
                          <span className="sr-only">メニューを開く</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/permissions/${permission.id}`}>
                          <DropdownMenuItem>
                            <Edit2Icon className="mr-2 h-4 w-4" />
                            <span>編集</span>
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteClick(permission.id)}
                        >
                          <Trash2Icon className="mr-2 h-4 w-4" />
                          <span>削除</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <DeletePermissionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
      <ConnectModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        client={
          permissions.find((p) => p.id === selectedPermission)?.connectionInfo
            .client || ""
        }
        apiKey={
          permissions.find((p) => p.id === selectedPermission)?.connectionInfo
            .apiKey || ""
        }
      />
    </Card>
  );
}
