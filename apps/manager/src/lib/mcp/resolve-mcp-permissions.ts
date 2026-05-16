type DefaultRole = {
  defaultRead: boolean;
  defaultWrite: boolean;
  defaultExecute: boolean;
  mcpPermissions: Array<{
    mcpServerId: string;
    read: boolean;
    write: boolean;
    execute: boolean;
  }>;
};

export const resolveMcpPermissions = (
  serverId: string,
  defaultRole: DefaultRole | null | undefined,
) => {
  const specific = defaultRole?.mcpPermissions.find(
    (p) => p.mcpServerId === serverId,
  );
  return {
    read: specific?.read ?? defaultRole?.defaultRead ?? false,
    write: specific?.write ?? defaultRole?.defaultWrite ?? false,
    execute: specific?.execute ?? defaultRole?.defaultExecute ?? false,
  };
};
