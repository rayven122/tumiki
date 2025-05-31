import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerUpdateWithoutToolsInputSchema } from './McpServerUpdateWithoutToolsInputSchema';
import { McpServerUncheckedUpdateWithoutToolsInputSchema } from './McpServerUncheckedUpdateWithoutToolsInputSchema';
import { McpServerCreateWithoutToolsInputSchema } from './McpServerCreateWithoutToolsInputSchema';
import { McpServerUncheckedCreateWithoutToolsInputSchema } from './McpServerUncheckedCreateWithoutToolsInputSchema';
import { McpServerWhereInputSchema } from './McpServerWhereInputSchema';

export const McpServerUpsertWithoutToolsInputSchema: z.ZodType<Prisma.McpServerUpsertWithoutToolsInput> = z.object({
  update: z.union([ z.lazy(() => McpServerUpdateWithoutToolsInputSchema),z.lazy(() => McpServerUncheckedUpdateWithoutToolsInputSchema) ]),
  create: z.union([ z.lazy(() => McpServerCreateWithoutToolsInputSchema),z.lazy(() => McpServerUncheckedCreateWithoutToolsInputSchema) ]),
  where: z.lazy(() => McpServerWhereInputSchema).optional()
}).strict();

export default McpServerUpsertWithoutToolsInputSchema;
