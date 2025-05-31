import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerCreateWithoutMcpServerConfigsInputSchema } from './McpServerCreateWithoutMcpServerConfigsInputSchema';
import { McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema } from './McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { McpServerCreateOrConnectWithoutMcpServerConfigsInputSchema } from './McpServerCreateOrConnectWithoutMcpServerConfigsInputSchema';
import { McpServerUpsertWithoutMcpServerConfigsInputSchema } from './McpServerUpsertWithoutMcpServerConfigsInputSchema';
import { McpServerWhereUniqueInputSchema } from './McpServerWhereUniqueInputSchema';
import { McpServerUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema } from './McpServerUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema';
import { McpServerUpdateWithoutMcpServerConfigsInputSchema } from './McpServerUpdateWithoutMcpServerConfigsInputSchema';
import { McpServerUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './McpServerUncheckedUpdateWithoutMcpServerConfigsInputSchema';

export const McpServerUpdateOneRequiredWithoutMcpServerConfigsNestedInputSchema: z.ZodType<Prisma.McpServerUpdateOneRequiredWithoutMcpServerConfigsNestedInput> = z.object({
  create: z.union([ z.lazy(() => McpServerCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => McpServerUncheckedCreateWithoutMcpServerConfigsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => McpServerCreateOrConnectWithoutMcpServerConfigsInputSchema).optional(),
  upsert: z.lazy(() => McpServerUpsertWithoutMcpServerConfigsInputSchema).optional(),
  connect: z.lazy(() => McpServerWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => McpServerUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema),z.lazy(() => McpServerUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => McpServerUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]).optional(),
}).strict();

export default McpServerUpdateOneRequiredWithoutMcpServerConfigsNestedInputSchema;
