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
) => (value ? new Date(value).toLocaleDateString("ja-JP") : "-");

export const getCatalogEffect = (catalog: MatrixCatalog): PermissionState =>
  catalog.orgUnitCatalogPermissions[0]?.effect ?? null;

export const getToolEffect = (tool: MatrixTool): PermissionState =>
  tool.orgUnitPermissions[0]?.effect ?? null;

export const countEffects = (catalogs: MatrixCatalog[]): PermissionCounts =>
  catalogs.reduce(
    (counts, catalog) => {
      const catalogEffect = getCatalogEffect(catalog);
      if (catalogEffect === "ALLOW") counts.catalogAllow += 1;
      if (catalogEffect === "DENY") counts.catalogDeny += 1;

      for (const tool of catalog.tools) {
        const toolEffect = getToolEffect(tool);
        if (toolEffect === "ALLOW") counts.toolAllow += 1;
        if (toolEffect === "DENY") counts.toolDeny += 1;
      }

      return counts;
    },
    { catalogAllow: 0, catalogDeny: 0, toolAllow: 0, toolDeny: 0 },
  );
