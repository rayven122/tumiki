import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUpdateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';

export const UserMcpServerInstanceUpsertWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpsertWithoutMcpServerInstanceToolGroupsInput> = z.object({
  update: z.union([ z.lazy(() => UserMcpServerInstanceUpdateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema) ]),
  where: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional()
}).strict();

export default UserMcpServerInstanceUpsertWithoutMcpServerInstanceToolGroupsInputSchema;
