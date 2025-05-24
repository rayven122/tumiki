import { CreateCustomServerButton } from "./_components/CreateCustomServerButton";
import { McpTabs } from "../_components/McpTabs";
import { api } from "@/trpc/server";
import { UserMcpServerCard } from "../_components/UserMcpServerCard";

const AsyncServerCardList = async () => {
  const userCustomServers = await api.userMcpServerInstance.findCustomServers();
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {userCustomServers.map((server) => (
        <UserMcpServerCard key={server.id} serverInstance={server} />
      ))}
    </div>
  );
};

export default function CustomServersPage() {
  return (
    <McpTabs
      activeTab="custom-servers"
      addButton={<CreateCustomServerButton />}
    >
      <AsyncServerCardList />
    </McpTabs>
  );
}
