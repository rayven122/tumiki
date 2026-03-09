"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@tumiki/ui/button";
import { Badge } from "@tumiki/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@tumiki/ui/table";
import { Edit, Trash2, Globe, Lock } from "lucide-react";
import { api } from "@/trpc/react";
import { McpTemplateFilters } from "./McpTemplateFilters";
import { McpTemplateDeleteDialog } from "./McpTemplateDeleteDialog";
import type { TransportType, AuthType } from "@tumiki/db";

type McpTemplateListProps = {
  orgSlug: string;
};

export const McpTemplateList = ({ orgSlug }: McpTemplateListProps) => {
  const router = useRouter();
  const [transportTypeFilter, setTransportTypeFilter] =
    useState<TransportType>();
  const [authTypeFilter, setAuthTypeFilter] = useState<AuthType>();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data: templates, isLoading } = api.mcpServerTemplate.list.useQuery({
    transportType: transportTypeFilter,
    authType: authTypeFilter,
    search: searchQuery || undefined,
    tags: tagsFilter.length > 0 ? tagsFilter : undefined,
  });

  const handleEdit = (id: string) => {
    router.push(`/${orgSlug}/admin/mcp-templates/${id}/edit`);
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="space-y-4">
        <McpTemplateFilters
          transportTypeFilter={transportTypeFilter}
          authTypeFilter={authTypeFilter}
          searchQuery={searchQuery}
          tagsFilter={tagsFilter}
          onTransportTypeChange={setTransportTypeFilter}
          onAuthTypeChange={setAuthTypeFilter}
          onSearchChange={setSearchQuery}
          onTagsChange={setTagsFilter}
        />
        <div className="py-8 text-center text-sm text-gray-500">
          テンプレートが見つかりません
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <McpTemplateFilters
        transportTypeFilter={transportTypeFilter}
        authTypeFilter={authTypeFilter}
        searchQuery={searchQuery}
        tagsFilter={tagsFilter}
        onTransportTypeChange={setTransportTypeFilter}
        onAuthTypeChange={setAuthTypeFilter}
        onSearchChange={setSearchQuery}
        onTagsChange={setTagsFilter}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>識別子</TableHead>
              <TableHead>接続タイプ</TableHead>
              <TableHead>認証</TableHead>
              <TableHead>公開範囲</TableHead>
              <TableHead>タグ</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell className="font-medium">{template.name}</TableCell>
                <TableCell>
                  <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                    {template.normalizedName}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{template.transportType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{template.authType}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {template.visibility === "PUBLIC" ? (
                      <>
                        <Globe className="h-3 w-3" />
                        <span className="text-xs">公開</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" />
                        <span className="text-xs">非公開</span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTargetId(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {deleteTargetId && (
        <McpTemplateDeleteDialog
          templateId={deleteTargetId}
          open={!!deleteTargetId}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTargetId(null);
            }
          }}
        />
      )}
    </div>
  );
};
