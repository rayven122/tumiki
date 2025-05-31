import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';
import { ToolUpdateWithoutMcpServerInputSchema } from './ToolUpdateWithoutMcpServerInputSchema';
import { ToolUncheckedUpdateWithoutMcpServerInputSchema } from './ToolUncheckedUpdateWithoutMcpServerInputSchema';

export const ToolUpdateWithWhereUniqueWithoutMcpServerInputSchema: z.ZodType<Prisma.ToolUpdateWithWhereUniqueWithoutMcpServerInput> = z.object({
  where: z.lazy(() => ToolWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ToolUpdateWithoutMcpServerInputSchema),z.lazy(() => ToolUncheckedUpdateWithoutMcpServerInputSchema) ]),
}).strict();

export default ToolUpdateWithWhereUniqueWithoutMcpServerInputSchema;
