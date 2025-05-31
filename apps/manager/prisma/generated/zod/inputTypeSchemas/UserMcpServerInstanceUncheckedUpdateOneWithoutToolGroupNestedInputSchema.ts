import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceCreateOrConnectWithoutToolGroupInputSchema } from './UserMcpServerInstanceCreateOrConnectWithoutToolGroupInputSchema';
import { UserMcpServerInstanceUpsertWithoutToolGroupInputSchema } from './UserMcpServerInstanceUpsertWithoutToolGroupInputSchema';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceUpdateToOneWithWhereWithoutToolGroupInputSchema } from './UserMcpServerInstanceUpdateToOneWithWhereWithoutToolGroupInputSchema';
import { UserMcpServerInstanceUpdateWithoutToolGroupInputSchema } from './UserMcpServerInstanceUpdateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceUncheckedUpdateWithoutToolGroupInputSchema } from './UserMcpServerInstanceUncheckedUpdateWithoutToolGroupInputSchema';

export const UserMcpServerInstanceUncheckedUpdateOneWithoutToolGroupNestedInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUncheckedUpdateOneWithoutToolGroupNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutToolGroupInputSchema).optional(),
  upsert: z.lazy(() => UserMcpServerInstanceUpsertWithoutToolGroupInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => UserMcpServerInstanceWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => UserMcpServerInstanceWhereInputSchema) ]).optional(),
  connect: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserMcpServerInstanceUpdateToOneWithWhereWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceUpdateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateWithoutToolGroupInputSchema) ]).optional(),
}).strict();

export default UserMcpServerInstanceUncheckedUpdateOneWithoutToolGroupNestedInputSchema;
