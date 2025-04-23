import { UserMcpServerCard } from "../../_components/UserMcpServerCard";
import { api } from "@/trpc/server";

const UserMcpServerList = async () => {
  const userMcpServers = await api.userMcpServer.findAllWithMcpServerTools();
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {userMcpServers.map((userMcpServer) => (
        <UserMcpServerCard
          key={userMcpServer.id}
          userMcpServer={userMcpServer}
        />
      ))}
    </div>
  );
};

export default function ServersPage() {
  return <UserMcpServerList />;
}
