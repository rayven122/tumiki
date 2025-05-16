import { McpTabs } from "../_components/McpTabs";
import { ApiKeysTab } from "./_components/ApiKeysTab";
import { CreateApiKeyButton } from "./_components/CreateApiKeyButton";

export default function AccessPage() {
  return (
    <McpTabs activeTab="access" addButton={<CreateApiKeyButton />}>
      <ApiKeysTab />
    </McpTabs>
  );
}
