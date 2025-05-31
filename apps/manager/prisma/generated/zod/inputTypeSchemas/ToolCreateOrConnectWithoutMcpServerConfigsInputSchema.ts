import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';
import { ToolCreateWithoutMcpServerConfigsInputSchema } from './ToolCreateWithoutMcpServerConfigsInputSchema';
import { ToolUncheckedCreateWithoutMcpServerConfigsInputSchema } from './ToolUncheckedCreateWithoutMcpServerConfigsInputSchema';

export const ToolCreateOrConnectWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.ToolCreateOrConnectWithoutMcpServerConfigsInput> = z.object({
  where: z.lazy(() => ToolWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ToolCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolUncheckedCreateWithoutMcpServerConfigsInputSchema) ]),
}).strict();

export default ToolCreateOrConnectWithoutMcpServerConfigsInputSchema;
