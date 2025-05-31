import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolWhereInputSchema } from './ToolWhereInputSchema';
import { ToolUpdateWithoutToolGroupToolsInputSchema } from './ToolUpdateWithoutToolGroupToolsInputSchema';
import { ToolUncheckedUpdateWithoutToolGroupToolsInputSchema } from './ToolUncheckedUpdateWithoutToolGroupToolsInputSchema';

export const ToolUpdateToOneWithWhereWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.ToolUpdateToOneWithWhereWithoutToolGroupToolsInput> = z.object({
  where: z.lazy(() => ToolWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => ToolUpdateWithoutToolGroupToolsInputSchema),z.lazy(() => ToolUncheckedUpdateWithoutToolGroupToolsInputSchema) ]),
}).strict();

export default ToolUpdateToOneWithWhereWithoutToolGroupToolsInputSchema;
