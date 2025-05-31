import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerWhereInputSchema } from './McpServerWhereInputSchema';
import { McpServerUpdateWithoutMcpServerConfigsInputSchema } from './McpServerUpdateWithoutMcpServerConfigsInputSchema';
import { McpServerUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './McpServerUncheckedUpdateWithoutMcpServerConfigsInputSchema';

export const McpServerUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.McpServerUpdateToOneWithWhereWithoutMcpServerConfigsInput> = z.object({
  where: z.lazy(() => McpServerWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => McpServerUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => McpServerUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]),
}).strict();

export default McpServerUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema;
