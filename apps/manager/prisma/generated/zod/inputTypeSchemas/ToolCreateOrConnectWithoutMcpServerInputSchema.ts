import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';
import { ToolCreateWithoutMcpServerInputSchema } from './ToolCreateWithoutMcpServerInputSchema';
import { ToolUncheckedCreateWithoutMcpServerInputSchema } from './ToolUncheckedCreateWithoutMcpServerInputSchema';

export const ToolCreateOrConnectWithoutMcpServerInputSchema: z.ZodType<Prisma.ToolCreateOrConnectWithoutMcpServerInput> = z.object({
  where: z.lazy(() => ToolWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ToolCreateWithoutMcpServerInputSchema),z.lazy(() => ToolUncheckedCreateWithoutMcpServerInputSchema) ]),
}).strict();

export default ToolCreateOrConnectWithoutMcpServerInputSchema;
