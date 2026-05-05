import { ipcMain } from "electron";
import { getMcpProxyLaunchCommand } from "./launch-command";

export const setupMcpProxyLaunchCommandIpc = (): void => {
  ipcMain.handle("mcp-proxy:getLaunchCommand", () => {
    return getMcpProxyLaunchCommand();
  });
};
