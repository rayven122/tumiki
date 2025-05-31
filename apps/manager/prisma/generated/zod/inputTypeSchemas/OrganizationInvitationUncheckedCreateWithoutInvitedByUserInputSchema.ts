import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationCreateroleIdsInputSchema } from './OrganizationInvitationCreateroleIdsInputSchema';
import { OrganizationInvitationCreategroupIdsInputSchema } from './OrganizationInvitationCreategroupIdsInputSchema';

export const OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema: z.ZodType<Prisma.OrganizationInvitationUncheckedCreateWithoutInvitedByUserInput> = z.object({
  id: z.string().optional(),
  organizationId: z.string(),
  email: z.string(),
  token: z.string().optional(),
  isAdmin: z.boolean().optional(),
  roleIds: z.union([ z.lazy(() => OrganizationInvitationCreateroleIdsInputSchema),z.string().array() ]).optional(),
  groupIds: z.union([ z.lazy(() => OrganizationInvitationCreategroupIdsInputSchema),z.string().array() ]).optional(),
  expires: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema;
