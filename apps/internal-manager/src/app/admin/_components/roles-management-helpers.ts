import type { RouterOutputs } from "~/trpc/react";

type MatrixData = RouterOutputs["mcpPolicies"]["getMatrix"];

export type MatrixCatalog = MatrixData["catalogs"][number];
export type MatrixTool = MatrixCatalog["tools"][number];
export type PermissionState =
  | MatrixCatalog["orgUnitCatalogPermissions"][number]["effect"]
  | null;

export type PermissionCounts = {
  catalogAllow: number;
  catalogDeny: number;
  toolAllow: number;
  toolDeny: number;
};

export const formatRolePermissionDate = (
  value: Date | string | null | undefined,
) =>
  value
    ? new Date(value).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })
    : "-";

export const getCatalogEffect = (catalog: MatrixCatalog): PermissionState =>
  catalog.orgUnitCatalogPermissions[0]?.effect ?? null;

export const getToolEffect = (tool: MatrixTool): PermissionState =>
  tool.orgUnitPermissions[0]?.effect ?? null;

export const countEffects = (catalogs: MatrixCatalog[]): PermissionCounts =>
  catalogs.reduce(
    (counts, catalog) => {
      const catalogEffect = getCatalogEffect(catalog);
      const toolCounts = catalog.tools.reduce(
        (current, tool) => {
          const toolEffect = getToolEffect(tool);

          return {
            toolAllow: current.toolAllow + (toolEffect === "ALLOW" ? 1 : 0),
            toolDeny: current.toolDeny + (toolEffect === "DENY" ? 1 : 0),
          };
        },
        { toolAllow: 0, toolDeny: 0 },
      );

      return {
        catalogAllow: counts.catalogAllow + (catalogEffect === "ALLOW" ? 1 : 0),
        catalogDeny: counts.catalogDeny + (catalogEffect === "DENY" ? 1 : 0),
        toolAllow: counts.toolAllow + toolCounts.toolAllow,
        toolDeny: counts.toolDeny + toolCounts.toolDeny,
      };
    },
    { catalogAllow: 0, catalogDeny: 0, toolAllow: 0, toolDeny: 0 },
  );
