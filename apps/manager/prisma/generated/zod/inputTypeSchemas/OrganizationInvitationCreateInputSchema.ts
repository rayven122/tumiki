import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationCreateroleIdsInputSchema } from './OrganizationInvitationCreateroleIdsInputSchema';
import { OrganizationInvitationCreategroupIdsInputSchema } from './OrganizationInvitationCreategroupIdsInputSchema';
import { OrganizationCreateNestedOneWithoutInvitationsInputSchema } from './OrganizationCreateNestedOneWithoutInvitationsInputSchema';
import { UserCreateNestedOneWithoutInvitationsInputSchema } from './UserCreateNestedOneWithoutInvitationsInputSchema';

export const OrganizationInvitationCreateInputSchema: z.ZodType<Prisma.OrganizationInvitationCreateInput> = z.object({
  id: z.string().optional(),
  email: z.string(),
  token: z.string().optional(),
  isAdmin: z.boolean().optional(),
  roleIds: z.union([ z.lazy(() => OrganizationInvitationCreateroleIdsInputSchema),z.string().array() ]).optional(),
  groupIds: z.union([ z.lazy(() => OrganizationInvitationCreategroupIdsInputSchema),z.string().array() ]).optional(),
  expires: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutInvitationsInputSchema),
  invitedByUser: z.lazy(() => UserCreateNestedOneWithoutInvitationsInputSchema)
}).strict();

export default OrganizationInvitationCreateInputSchema;
