export type DesktopAppMode = "gui" | "mcp-proxy" | "analytics";

export const ANALYTICS_RECEIVER_FLAG = "--analytics";
export const LEGACY_TELEMETRY_RECEIVER_FLAG = "--telemetry-receiver";

export const resolveDesktopAppMode = (
  argv: readonly string[],
): DesktopAppMode => {
  if (argv.includes("--mcp-proxy")) return "mcp-proxy";
  if (
    argv.includes(ANALYTICS_RECEIVER_FLAG) ||
    argv.includes(LEGACY_TELEMETRY_RECEIVER_FLAG)
  ) {
    return "analytics";
  }
  return "gui";
};
