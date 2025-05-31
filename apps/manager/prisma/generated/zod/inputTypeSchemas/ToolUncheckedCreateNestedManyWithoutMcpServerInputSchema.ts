import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolCreateWithoutMcpServerInputSchema } from './ToolCreateWithoutMcpServerInputSchema';
import { ToolUncheckedCreateWithoutMcpServerInputSchema } from './ToolUncheckedCreateWithoutMcpServerInputSchema';
import { ToolCreateOrConnectWithoutMcpServerInputSchema } from './ToolCreateOrConnectWithoutMcpServerInputSchema';
import { ToolCreateManyMcpServerInputEnvelopeSchema } from './ToolCreateManyMcpServerInputEnvelopeSchema';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';

export const ToolUncheckedCreateNestedManyWithoutMcpServerInputSchema: z.ZodType<Prisma.ToolUncheckedCreateNestedManyWithoutMcpServerInput> = z.object({
  create: z.union([ z.lazy(() => ToolCreateWithoutMcpServerInputSchema),z.lazy(() => ToolCreateWithoutMcpServerInputSchema).array(),z.lazy(() => ToolUncheckedCreateWithoutMcpServerInputSchema),z.lazy(() => ToolUncheckedCreateWithoutMcpServerInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ToolCreateOrConnectWithoutMcpServerInputSchema),z.lazy(() => ToolCreateOrConnectWithoutMcpServerInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ToolCreateManyMcpServerInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ToolWhereUniqueInputSchema),z.lazy(() => ToolWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default ToolUncheckedCreateNestedManyWithoutMcpServerInputSchema;
