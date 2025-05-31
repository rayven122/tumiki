import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateWithoutToolGroupToolsInputSchema } from './UserToolGroupCreateWithoutToolGroupToolsInputSchema';
import { UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema } from './UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema';
import { UserToolGroupCreateOrConnectWithoutToolGroupToolsInputSchema } from './UserToolGroupCreateOrConnectWithoutToolGroupToolsInputSchema';
import { UserToolGroupUpsertWithoutToolGroupToolsInputSchema } from './UserToolGroupUpsertWithoutToolGroupToolsInputSchema';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupUpdateToOneWithWhereWithoutToolGroupToolsInputSchema } from './UserToolGroupUpdateToOneWithWhereWithoutToolGroupToolsInputSchema';
import { UserToolGroupUpdateWithoutToolGroupToolsInputSchema } from './UserToolGroupUpdateWithoutToolGroupToolsInputSchema';
import { UserToolGroupUncheckedUpdateWithoutToolGroupToolsInputSchema } from './UserToolGroupUncheckedUpdateWithoutToolGroupToolsInputSchema';

export const UserToolGroupUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema: z.ZodType<Prisma.UserToolGroupUpdateOneRequiredWithoutToolGroupToolsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutToolGroupToolsInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserToolGroupCreateOrConnectWithoutToolGroupToolsInputSchema).optional(),
  upsert: z.lazy(() => UserToolGroupUpsertWithoutToolGroupToolsInputSchema).optional(),
  connect: z.lazy(() => UserToolGroupWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserToolGroupUpdateToOneWithWhereWithoutToolGroupToolsInputSchema),z.lazy(() => UserToolGroupUpdateWithoutToolGroupToolsInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutToolGroupToolsInputSchema) ]).optional(),
}).strict();

export default UserToolGroupUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema;
