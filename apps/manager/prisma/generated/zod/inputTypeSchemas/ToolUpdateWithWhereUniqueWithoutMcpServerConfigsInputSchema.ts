import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';
import { ToolUpdateWithoutMcpServerConfigsInputSchema } from './ToolUpdateWithoutMcpServerConfigsInputSchema';
import { ToolUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './ToolUncheckedUpdateWithoutMcpServerConfigsInputSchema';

export const ToolUpdateWithWhereUniqueWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.ToolUpdateWithWhereUniqueWithoutMcpServerConfigsInput> = z.object({
  where: z.lazy(() => ToolWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ToolUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]),
}).strict();

export default ToolUpdateWithWhereUniqueWithoutMcpServerConfigsInputSchema;
