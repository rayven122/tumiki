import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerWhereUniqueInputSchema } from './McpServerWhereUniqueInputSchema';
import { McpServerCreateWithoutToolsInputSchema } from './McpServerCreateWithoutToolsInputSchema';
import { McpServerUncheckedCreateWithoutToolsInputSchema } from './McpServerUncheckedCreateWithoutToolsInputSchema';

export const McpServerCreateOrConnectWithoutToolsInputSchema: z.ZodType<Prisma.McpServerCreateOrConnectWithoutToolsInput> = z.object({
  where: z.lazy(() => McpServerWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => McpServerCreateWithoutToolsInputSchema),z.lazy(() => McpServerUncheckedCreateWithoutToolsInputSchema) ]),
}).strict();

export default McpServerCreateOrConnectWithoutToolsInputSchema;
