import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationScalarWhereInputSchema } from './OrganizationInvitationScalarWhereInputSchema';
import { OrganizationInvitationUpdateManyMutationInputSchema } from './OrganizationInvitationUpdateManyMutationInputSchema';
import { OrganizationInvitationUncheckedUpdateManyWithoutOrganizationInputSchema } from './OrganizationInvitationUncheckedUpdateManyWithoutOrganizationInputSchema';

export const OrganizationInvitationUpdateManyWithWhereWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationInvitationUpdateManyWithWhereWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationInvitationScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationInvitationUpdateManyMutationInputSchema),z.lazy(() => OrganizationInvitationUncheckedUpdateManyWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationInvitationUpdateManyWithWhereWithoutOrganizationInputSchema;
