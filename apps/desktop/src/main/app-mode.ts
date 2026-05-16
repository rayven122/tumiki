export type DesktopAppMode = "gui" | "mcp-proxy" | "telemetry-receiver";

export const resolveDesktopAppMode = (
  argv: readonly string[],
): DesktopAppMode => {
  if (argv.includes("--mcp-proxy")) return "mcp-proxy";
  if (argv.includes("--telemetry-receiver")) return "telemetry-receiver";
  return "gui";
};
