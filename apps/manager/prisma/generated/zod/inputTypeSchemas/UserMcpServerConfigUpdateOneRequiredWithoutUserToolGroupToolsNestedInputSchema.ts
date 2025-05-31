import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigCreateOrConnectWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigCreateOrConnectWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigUpsertWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUpsertWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateToOneWithWhereWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUpdateToOneWithWhereWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigUpdateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUpdateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutUserToolGroupToolsInputSchema';

export const UserMcpServerConfigUpdateOneRequiredWithoutUserToolGroupToolsNestedInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateOneRequiredWithoutUserToolGroupToolsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutUserToolGroupToolsInputSchema).optional(),
  upsert: z.lazy(() => UserMcpServerConfigUpsertWithoutUserToolGroupToolsInputSchema).optional(),
  connect: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserMcpServerConfigUpdateToOneWithWhereWithoutUserToolGroupToolsInputSchema),z.lazy(() => UserMcpServerConfigUpdateWithoutUserToolGroupToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutUserToolGroupToolsInputSchema) ]).optional(),
}).strict();

export default UserMcpServerConfigUpdateOneRequiredWithoutUserToolGroupToolsNestedInputSchema;
