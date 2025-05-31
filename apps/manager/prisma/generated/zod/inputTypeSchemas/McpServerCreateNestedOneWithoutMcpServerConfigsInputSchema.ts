import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerCreateWithoutMcpServerConfigsInputSchema } from './McpServerCreateWithoutMcpServerConfigsInputSchema';
import { McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema } from './McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { McpServerCreateOrConnectWithoutMcpServerConfigsInputSchema } from './McpServerCreateOrConnectWithoutMcpServerConfigsInputSchema';
import { McpServerWhereUniqueInputSchema } from './McpServerWhereUniqueInputSchema';

export const McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.McpServerCreateNestedOneWithoutMcpServerConfigsInput> = z.object({
  create: z.union([ z.lazy(() => McpServerCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => McpServerCreateOrConnectWithoutMcpServerConfigsInputSchema).optional(),
  connect: z.lazy(() => McpServerWhereUniqueInputSchema).optional()
}).strict();

export default McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema;
