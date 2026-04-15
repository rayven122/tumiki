/**
 * Electronの userData 相当のパスを OS ごとに解決
 * Electron は内部で productName ("Tumiki") を使って userData を決定するため、同じパスを返す。
 * Electron非依存なので、CLIからもDesktopからも利用可能。
 */
import { homedir } from "os";
import { join } from "path";

export const resolveUserDataPath = (): string => {
  const home = homedir();
  switch (process.platform) {
    case "darwin":
      return join(home, "Library/Application Support/Tumiki");
    case "win32":
      return join(
        process.env.APPDATA ?? join(home, "AppData/Roaming"),
        "Tumiki",
      );
    default:
      return join(
        process.env.XDG_CONFIG_HOME ?? join(home, ".config"),
        "Tumiki",
      );
  }
};
