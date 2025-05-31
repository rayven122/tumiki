import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerWhereInputSchema } from './McpServerWhereInputSchema';
import { McpServerUpdateWithoutToolsInputSchema } from './McpServerUpdateWithoutToolsInputSchema';
import { McpServerUncheckedUpdateWithoutToolsInputSchema } from './McpServerUncheckedUpdateWithoutToolsInputSchema';

export const McpServerUpdateToOneWithWhereWithoutToolsInputSchema: z.ZodType<Prisma.McpServerUpdateToOneWithWhereWithoutToolsInput> = z.object({
  where: z.lazy(() => McpServerWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => McpServerUpdateWithoutToolsInputSchema),z.lazy(() => McpServerUncheckedUpdateWithoutToolsInputSchema) ]),
}).strict();

export default McpServerUpdateToOneWithWhereWithoutToolsInputSchema;
