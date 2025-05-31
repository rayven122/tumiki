import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolScalarWhereInputSchema } from './ToolScalarWhereInputSchema';
import { ToolUpdateManyMutationInputSchema } from './ToolUpdateManyMutationInputSchema';
import { ToolUncheckedUpdateManyWithoutMcpServerConfigsInputSchema } from './ToolUncheckedUpdateManyWithoutMcpServerConfigsInputSchema';

export const ToolUpdateManyWithWhereWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.ToolUpdateManyWithWhereWithoutMcpServerConfigsInput> = z.object({
  where: z.lazy(() => ToolScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ToolUpdateManyMutationInputSchema),z.lazy(() => ToolUncheckedUpdateManyWithoutMcpServerConfigsInputSchema) ]),
}).strict();

export default ToolUpdateManyWithWhereWithoutMcpServerConfigsInputSchema;
