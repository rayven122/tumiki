import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { create } from "./create";
import { update } from "./update";
import { deleteRole } from "./delete";
import { getByOrganization } from "./getByOrganization";
import { updatePermissions } from "./updatePermissions";
import { setDefault } from "./setDefault";
import {
  CreateRoleInput,
  UpdateRoleInput,
  DeleteRoleInput,
  GetRolesByOrganizationInput,
  UpdatePermissionsInput,
  SetDefaultRoleInput,
} from "./schemas";

export const organizationRoleRouter = createTRPCRouter({
  create: protectedProcedure.input(CreateRoleInput).mutation(create),

  update: protectedProcedure.input(UpdateRoleInput).mutation(update),

  delete: protectedProcedure.input(DeleteRoleInput).mutation(deleteRole),

  getByOrganization: protectedProcedure
    .input(GetRolesByOrganizationInput)
    .query(getByOrganization),

  updatePermissions: protectedProcedure
    .input(UpdatePermissionsInput)
    .mutation(updatePermissions),

  setDefault: protectedProcedure
    .input(SetDefaultRoleInput)
    .mutation(setDefault),
});
