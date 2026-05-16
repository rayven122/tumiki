import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { app } from "electron";

const execFileAsync = promisify(execFile);

export const TELEMETRY_LAUNCH_AGENT_LABEL = "com.tumiki.desktop.telemetry";

const getLaunchAgentsDir = (): string =>
  path.join(os.homedir(), "Library", "LaunchAgents");

const getLogsDir = (): string =>
  path.join(os.homedir(), "Library", "Logs", "Tumiki");

export const getTelemetryLaunchAgentPath = (): string =>
  path.join(getLaunchAgentsDir(), `${TELEMETRY_LAUNCH_AGENT_LABEL}.plist`);

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export type TelemetryReceiverLaunchCommand = {
  command: string;
  args: string[];
};

export const getTelemetryReceiverLaunchCommand =
  (): TelemetryReceiverLaunchCommand => {
    if (app.isPackaged) {
      return { command: process.execPath, args: ["--telemetry-receiver"] };
    }

    const rawAppEntry = process.argv[1];
    const appEntry = rawAppEntry ? path.resolve(rawAppEntry) : null;
    return {
      command: process.execPath,
      args: appEntry
        ? [appEntry, "--telemetry-receiver"]
        : ["--telemetry-receiver"],
    };
  };

export const buildTelemetryLaunchAgentPlist = (
  launchCommand: TelemetryReceiverLaunchCommand,
): string => {
  const programArguments = [launchCommand.command, ...launchCommand.args]
    .map((arg) => `    <string>${escapeXml(arg)}</string>`)
    .join("\n");
  const logsDir = getLogsDir();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${TELEMETRY_LAUNCH_AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${programArguments}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>${escapeXml(path.join(logsDir, "telemetry-receiver.out.log"))}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(path.join(logsDir, "telemetry-receiver.err.log"))}</string>
</dict>
</plist>
`;
};

const getGuiDomain = (): string =>
  `gui/${String(process.getuid?.() ?? os.userInfo().uid)}`;

const runLaunchctl = async (
  args: string[],
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
}> => {
  try {
    const { stdout, stderr } = await execFileAsync("launchctl", args);
    return { success: true, stdout, stderr };
  } catch (error) {
    const maybeError = error as { stdout?: unknown; stderr?: unknown };
    return {
      success: false,
      stdout: typeof maybeError.stdout === "string" ? maybeError.stdout : "",
      stderr:
        typeof maybeError.stderr === "string"
          ? maybeError.stderr
          : String(error),
    };
  }
};

export const isTelemetryLaunchAgentSupported = (): boolean =>
  process.platform === "darwin";

export const installTelemetryLaunchAgent = async (): Promise<void> => {
  if (!isTelemetryLaunchAgentSupported()) {
    throw new Error("LaunchAgent is supported on macOS only");
  }

  await fs.mkdir(getLaunchAgentsDir(), { recursive: true });
  await fs.mkdir(getLogsDir(), { recursive: true });
  await fs.writeFile(
    getTelemetryLaunchAgentPath(),
    buildTelemetryLaunchAgentPlist(getTelemetryReceiverLaunchCommand()),
    "utf-8",
  );

  const domain = getGuiDomain();
  await runLaunchctl(["bootout", domain, getTelemetryLaunchAgentPath()]);
  const bootstrap = await runLaunchctl([
    "bootstrap",
    domain,
    getTelemetryLaunchAgentPath(),
  ]);
  if (!bootstrap.success) {
    throw new Error(`launchctl bootstrap failed: ${bootstrap.stderr}`);
  }
  await runLaunchctl([
    "kickstart",
    "-k",
    `${domain}/${TELEMETRY_LAUNCH_AGENT_LABEL}`,
  ]);
};

export const uninstallTelemetryLaunchAgent = async (): Promise<void> => {
  if (!isTelemetryLaunchAgentSupported()) return;
  await runLaunchctl([
    "bootout",
    getGuiDomain(),
    getTelemetryLaunchAgentPath(),
  ]);
  await fs.rm(getTelemetryLaunchAgentPath(), { force: true });
};

export type TelemetryLaunchAgentRuntimeStatus = {
  supported: boolean;
  installed: boolean;
  loaded: boolean;
};

export const getTelemetryLaunchAgentRuntimeStatus =
  async (): Promise<TelemetryLaunchAgentRuntimeStatus> => {
    if (!isTelemetryLaunchAgentSupported()) {
      return {
        supported: false,
        installed: false,
        loaded: false,
      };
    }

    const plistPath = getTelemetryLaunchAgentPath();
    const installed = await fs
      .access(plistPath)
      .then(() => true)
      .catch(() => false);
    const printed = await runLaunchctl([
      "print",
      `${getGuiDomain()}/${TELEMETRY_LAUNCH_AGENT_LABEL}`,
    ]);

    return {
      supported: true,
      installed,
      loaded: printed.success,
    };
  };
