import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';
import { ToolUpdateWithoutMcpServerConfigsInputSchema } from './ToolUpdateWithoutMcpServerConfigsInputSchema';
import { ToolUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './ToolUncheckedUpdateWithoutMcpServerConfigsInputSchema';
import { ToolCreateWithoutMcpServerConfigsInputSchema } from './ToolCreateWithoutMcpServerConfigsInputSchema';
import { ToolUncheckedCreateWithoutMcpServerConfigsInputSchema } from './ToolUncheckedCreateWithoutMcpServerConfigsInputSchema';

export const ToolUpsertWithWhereUniqueWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.ToolUpsertWithWhereUniqueWithoutMcpServerConfigsInput> = z.object({
  where: z.lazy(() => ToolWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ToolUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]),
  create: z.union([ z.lazy(() => ToolCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolUncheckedCreateWithoutMcpServerConfigsInputSchema) ]),
}).strict();

export default ToolUpsertWithWhereUniqueWithoutMcpServerConfigsInputSchema;
