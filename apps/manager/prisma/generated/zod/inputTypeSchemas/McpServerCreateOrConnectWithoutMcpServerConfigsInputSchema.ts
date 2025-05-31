import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerWhereUniqueInputSchema } from './McpServerWhereUniqueInputSchema';
import { McpServerCreateWithoutMcpServerConfigsInputSchema } from './McpServerCreateWithoutMcpServerConfigsInputSchema';
import { McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema } from './McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema';

export const McpServerCreateOrConnectWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.McpServerCreateOrConnectWithoutMcpServerConfigsInput> = z.object({
  where: z.lazy(() => McpServerWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => McpServerCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema) ]),
}).strict();

export default McpServerCreateOrConnectWithoutMcpServerConfigsInputSchema;
