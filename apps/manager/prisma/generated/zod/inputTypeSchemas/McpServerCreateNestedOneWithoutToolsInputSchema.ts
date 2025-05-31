import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerCreateWithoutToolsInputSchema } from './McpServerCreateWithoutToolsInputSchema';
import { McpServerUncheckedCreateWithoutToolsInputSchema } from './McpServerUncheckedCreateWithoutToolsInputSchema';
import { McpServerCreateOrConnectWithoutToolsInputSchema } from './McpServerCreateOrConnectWithoutToolsInputSchema';
import { McpServerWhereUniqueInputSchema } from './McpServerWhereUniqueInputSchema';

export const McpServerCreateNestedOneWithoutToolsInputSchema: z.ZodType<Prisma.McpServerCreateNestedOneWithoutToolsInput> = z.object({
  create: z.union([ z.lazy(() => McpServerCreateWithoutToolsInputSchema),z.lazy(() => McpServerUncheckedCreateWithoutToolsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => McpServerCreateOrConnectWithoutToolsInputSchema).optional(),
  connect: z.lazy(() => McpServerWhereUniqueInputSchema).optional()
}).strict();

export default McpServerCreateNestedOneWithoutToolsInputSchema;
