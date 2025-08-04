import { z } from "zod";
import { PermissionAction, ResourceType } from "@tumiki/db/server";

export const CreateRoleInput = z.object({
  organizationId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const UpdateRoleInput = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const DeleteRoleInput = z.object({
  id: z.string(),
});

export const GetRolesByOrganizationInput = z.object({
  organizationId: z.string(),
});

export const UpdatePermissionsInput = z.object({
  roleId: z.string(),
  permissions: z.array(
    z.object({
      resourceType: z.nativeEnum(ResourceType),
      action: z.nativeEnum(PermissionAction),
    }),
  ),
});

export const SetDefaultRoleInput = z.object({
  roleId: z.string(),
  organizationId: z.string(),
});

export type CreateRoleInputType = z.infer<typeof CreateRoleInput>;
export type UpdateRoleInputType = z.infer<typeof UpdateRoleInput>;
export type DeleteRoleInputType = z.infer<typeof DeleteRoleInput>;
export type GetRolesByOrganizationInputType = z.infer<
  typeof GetRolesByOrganizationInput
>;
export type UpdatePermissionsInputType = z.infer<typeof UpdatePermissionsInput>;
export type SetDefaultRoleInputType = z.infer<typeof SetDefaultRoleInput>;
