import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolUpdateWithoutToolGroupToolsInputSchema } from './ToolUpdateWithoutToolGroupToolsInputSchema';
import { ToolUncheckedUpdateWithoutToolGroupToolsInputSchema } from './ToolUncheckedUpdateWithoutToolGroupToolsInputSchema';
import { ToolCreateWithoutToolGroupToolsInputSchema } from './ToolCreateWithoutToolGroupToolsInputSchema';
import { ToolUncheckedCreateWithoutToolGroupToolsInputSchema } from './ToolUncheckedCreateWithoutToolGroupToolsInputSchema';
import { ToolWhereInputSchema } from './ToolWhereInputSchema';

export const ToolUpsertWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.ToolUpsertWithoutToolGroupToolsInput> = z.object({
  update: z.union([ z.lazy(() => ToolUpdateWithoutToolGroupToolsInputSchema),z.lazy(() => ToolUncheckedUpdateWithoutToolGroupToolsInputSchema) ]),
  create: z.union([ z.lazy(() => ToolCreateWithoutToolGroupToolsInputSchema),z.lazy(() => ToolUncheckedCreateWithoutToolGroupToolsInputSchema) ]),
  where: z.lazy(() => ToolWhereInputSchema).optional()
}).strict();

export default ToolUpsertWithoutToolGroupToolsInputSchema;
