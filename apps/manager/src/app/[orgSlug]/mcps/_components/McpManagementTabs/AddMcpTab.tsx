"use client";

import { ServerList } from "../../add/_components/ServerList";

type AddMcpTabProps = {
  orgSlug: string;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
};

export const AddMcpTab = ({
  orgSlug,
  searchQuery,
  onSearchQueryChange,
  selectedTags,
  onSelectedTagsChange,
}: AddMcpTabProps) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        テンプレートから選んで新しいMCPを接続
      </p>

      <ServerList
        orgSlug={orgSlug}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        selectedTags={selectedTags}
        onSelectedTagsChange={onSelectedTagsChange}
        showFilteringUI={false}
      />
    </div>
  );
};
