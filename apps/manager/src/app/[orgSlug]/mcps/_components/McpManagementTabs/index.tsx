"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Layers } from "lucide-react";
import { AddMcpTab } from "./AddMcpTab";
import { IntegrateMcpTab } from "./IntegrateMcpTab";

type McpManagementTabsProps = {
  orgSlug: string;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
};

export const McpManagementTabs = ({
  orgSlug,
  searchQuery,
  onSearchQueryChange,
  selectedTags,
  onSelectedTagsChange,
}: McpManagementTabsProps) => {
  return (
    <section className="mt-12">
      <Tabs defaultValue="add" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2">
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            MCPを追加
          </TabsTrigger>
          <TabsTrigger value="integrate" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            MCPを統合
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <AddMcpTab
            orgSlug={orgSlug}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            selectedTags={selectedTags}
            onSelectedTagsChange={onSelectedTagsChange}
          />
        </TabsContent>

        <TabsContent value="integrate">
          <IntegrateMcpTab />
        </TabsContent>
      </Tabs>
    </section>
  );
};
