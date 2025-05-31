import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationScalarWhereInputSchema } from './OrganizationInvitationScalarWhereInputSchema';
import { OrganizationInvitationUpdateManyMutationInputSchema } from './OrganizationInvitationUpdateManyMutationInputSchema';
import { OrganizationInvitationUncheckedUpdateManyWithoutInvitedByUserInputSchema } from './OrganizationInvitationUncheckedUpdateManyWithoutInvitedByUserInputSchema';

export const OrganizationInvitationUpdateManyWithWhereWithoutInvitedByUserInputSchema: z.ZodType<Prisma.OrganizationInvitationUpdateManyWithWhereWithoutInvitedByUserInput> = z.object({
  where: z.lazy(() => OrganizationInvitationScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationInvitationUpdateManyMutationInputSchema),z.lazy(() => OrganizationInvitationUncheckedUpdateManyWithoutInvitedByUserInputSchema) ]),
}).strict();

export default OrganizationInvitationUpdateManyWithWhereWithoutInvitedByUserInputSchema;
