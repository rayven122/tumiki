import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerUpdateWithoutMcpServerConfigsInputSchema } from './McpServerUpdateWithoutMcpServerConfigsInputSchema';
import { McpServerUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './McpServerUncheckedUpdateWithoutMcpServerConfigsInputSchema';
import { McpServerCreateWithoutMcpServerConfigsInputSchema } from './McpServerCreateWithoutMcpServerConfigsInputSchema';
import { McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema } from './McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { McpServerWhereInputSchema } from './McpServerWhereInputSchema';

export const McpServerUpsertWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.McpServerUpsertWithoutMcpServerConfigsInput> = z.object({
  update: z.union([ z.lazy(() => McpServerUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => McpServerUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]),
  create: z.union([ z.lazy(() => McpServerCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema) ]),
  where: z.lazy(() => McpServerWhereInputSchema).optional()
}).strict();

export default McpServerUpsertWithoutMcpServerConfigsInputSchema;
