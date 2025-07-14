import { CreateCustomServerButton } from "./_components/CreateCustomServerButton";
import { McpTabs } from "../_components/McpTabs";
import { ServerCardList } from "./ServerCardList";

export default function CustomServersPage() {
  return (
    <McpTabs
      activeTab="custom-servers"
      addButton={<CreateCustomServerButton />}
    >
      <ServerCardList />
    </McpTabs>
  );
}
