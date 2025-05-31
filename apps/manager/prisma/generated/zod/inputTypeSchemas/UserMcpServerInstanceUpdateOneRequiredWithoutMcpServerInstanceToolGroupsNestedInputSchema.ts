import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceUpsertWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUpsertWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUpdateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema';

export const UserMcpServerInstanceUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema).optional(),
  upsert: z.lazy(() => UserMcpServerInstanceUpsertWithoutMcpServerInstanceToolGroupsInputSchema).optional(),
  connect: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserMcpServerInstanceUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserMcpServerInstanceUpdateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema) ]).optional(),
}).strict();

export default UserMcpServerInstanceUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema;
