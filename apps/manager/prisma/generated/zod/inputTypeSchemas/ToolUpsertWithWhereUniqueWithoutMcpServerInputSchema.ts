import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';
import { ToolUpdateWithoutMcpServerInputSchema } from './ToolUpdateWithoutMcpServerInputSchema';
import { ToolUncheckedUpdateWithoutMcpServerInputSchema } from './ToolUncheckedUpdateWithoutMcpServerInputSchema';
import { ToolCreateWithoutMcpServerInputSchema } from './ToolCreateWithoutMcpServerInputSchema';
import { ToolUncheckedCreateWithoutMcpServerInputSchema } from './ToolUncheckedCreateWithoutMcpServerInputSchema';

export const ToolUpsertWithWhereUniqueWithoutMcpServerInputSchema: z.ZodType<Prisma.ToolUpsertWithWhereUniqueWithoutMcpServerInput> = z.object({
  where: z.lazy(() => ToolWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ToolUpdateWithoutMcpServerInputSchema),z.lazy(() => ToolUncheckedUpdateWithoutMcpServerInputSchema) ]),
  create: z.union([ z.lazy(() => ToolCreateWithoutMcpServerInputSchema),z.lazy(() => ToolUncheckedCreateWithoutMcpServerInputSchema) ]),
}).strict();

export default ToolUpsertWithWhereUniqueWithoutMcpServerInputSchema;
