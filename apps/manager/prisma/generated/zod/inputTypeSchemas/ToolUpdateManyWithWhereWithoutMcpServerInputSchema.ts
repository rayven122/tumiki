import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolScalarWhereInputSchema } from './ToolScalarWhereInputSchema';
import { ToolUpdateManyMutationInputSchema } from './ToolUpdateManyMutationInputSchema';
import { ToolUncheckedUpdateManyWithoutMcpServerInputSchema } from './ToolUncheckedUpdateManyWithoutMcpServerInputSchema';

export const ToolUpdateManyWithWhereWithoutMcpServerInputSchema: z.ZodType<Prisma.ToolUpdateManyWithWhereWithoutMcpServerInput> = z.object({
  where: z.lazy(() => ToolScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ToolUpdateManyMutationInputSchema),z.lazy(() => ToolUncheckedUpdateManyWithoutMcpServerInputSchema) ]),
}).strict();

export default ToolUpdateManyWithWhereWithoutMcpServerInputSchema;
