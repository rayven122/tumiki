import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerCreateWithoutToolsInputSchema } from './McpServerCreateWithoutToolsInputSchema';
import { McpServerUncheckedCreateWithoutToolsInputSchema } from './McpServerUncheckedCreateWithoutToolsInputSchema';
import { McpServerCreateOrConnectWithoutToolsInputSchema } from './McpServerCreateOrConnectWithoutToolsInputSchema';
import { McpServerUpsertWithoutToolsInputSchema } from './McpServerUpsertWithoutToolsInputSchema';
import { McpServerWhereUniqueInputSchema } from './McpServerWhereUniqueInputSchema';
import { McpServerUpdateToOneWithWhereWithoutToolsInputSchema } from './McpServerUpdateToOneWithWhereWithoutToolsInputSchema';
import { McpServerUpdateWithoutToolsInputSchema } from './McpServerUpdateWithoutToolsInputSchema';
import { McpServerUncheckedUpdateWithoutToolsInputSchema } from './McpServerUncheckedUpdateWithoutToolsInputSchema';

export const McpServerUpdateOneRequiredWithoutToolsNestedInputSchema: z.ZodType<Prisma.McpServerUpdateOneRequiredWithoutToolsNestedInput> = z.object({
  create: z.union([ z.lazy(() => McpServerCreateWithoutToolsInputSchema),z.lazy(() => McpServerUncheckedCreateWithoutToolsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => McpServerCreateOrConnectWithoutToolsInputSchema).optional(),
  upsert: z.lazy(() => McpServerUpsertWithoutToolsInputSchema).optional(),
  connect: z.lazy(() => McpServerWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => McpServerUpdateToOneWithWhereWithoutToolsInputSchema),z.lazy(() => McpServerUpdateWithoutToolsInputSchema),z.lazy(() => McpServerUncheckedUpdateWithoutToolsInputSchema) ]).optional(),
}).strict();

export default McpServerUpdateOneRequiredWithoutToolsNestedInputSchema;
