"use client";

import { Input } from "@tumiki/ui/input";
import { Label } from "@tumiki/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tumiki/ui/select";
import { Search } from "lucide-react";
import { TransportType, AuthType } from "@tumiki/db";

type McpTemplateFiltersProps = {
  transportTypeFilter?: TransportType;
  authTypeFilter?: AuthType;
  searchQuery: string;
  tagsFilter: string[];
  onTransportTypeChange: (value?: TransportType) => void;
  onAuthTypeChange: (value?: AuthType) => void;
  onSearchChange: (value: string) => void;
  onTagsChange: (value: string[]) => void;
};

export const McpTemplateFilters = ({
  transportTypeFilter,
  authTypeFilter,
  searchQuery,
  onTransportTypeChange,
  onAuthTypeChange,
  onSearchChange,
}: McpTemplateFiltersProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 検索 */}
      <div className="space-y-2">
        <Label htmlFor="search">検索</Label>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            id="search"
            type="text"
            placeholder="名前・説明で検索"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* 接続タイプフィルター */}
      <div className="space-y-2">
        <Label htmlFor="transportType">接続タイプ</Label>
        <Select
          value={transportTypeFilter ?? "ALL"}
          onValueChange={(value) =>
            onTransportTypeChange(
              value === "ALL" ? undefined : (value as TransportType),
            )
          }
        >
          <SelectTrigger id="transportType">
            <SelectValue placeholder="すべて" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">すべて</SelectItem>
            <SelectItem value={TransportType.STDIO}>STDIO</SelectItem>
            <SelectItem value={TransportType.SSE}>SSE</SelectItem>
            <SelectItem value={TransportType.STREAMABLE_HTTPS}>
              STREAMABLE_HTTPS
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 認証タイプフィルター */}
      <div className="space-y-2">
        <Label htmlFor="authType">認証タイプ</Label>
        <Select
          value={authTypeFilter ?? "ALL"}
          onValueChange={(value) =>
            onAuthTypeChange(value === "ALL" ? undefined : (value as AuthType))
          }
        >
          <SelectTrigger id="authType">
            <SelectValue placeholder="すべて" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">すべて</SelectItem>
            <SelectItem value={AuthType.NONE}>NONE</SelectItem>
            <SelectItem value={AuthType.API_KEY}>API_KEY</SelectItem>
            <SelectItem value={AuthType.OAUTH}>OAUTH</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
