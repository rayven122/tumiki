import { Suspense } from "react";
import { ApiKeysTab } from "./_components/ApiKeysTab";
import { ApiKeysTabSkeleton } from "./_components/ApiKeysTabSkeleton";
import { CreateApiKeyButton } from "./_components/CreateApiKeyButton";
import { McpTabs } from "../_components/McpTabs";
import { api } from "@/trpc/server";

const AsyncApiKeysTab = async () => {
  const apiKeys = await api.apiKey.findAll();
  return <ApiKeysTab apiKeys={apiKeys} />;
};

export default function AccessPage() {
  return (
    <McpTabs activeTab="access" addButton={<CreateApiKeyButton />}>
      <Suspense fallback={<ApiKeysTabSkeleton />}>
        <AsyncApiKeysTab />
      </Suspense>
    </McpTabs>
  );
}
