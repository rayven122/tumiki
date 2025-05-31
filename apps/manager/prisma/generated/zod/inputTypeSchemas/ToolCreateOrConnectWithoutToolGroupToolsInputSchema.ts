import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';
import { ToolCreateWithoutToolGroupToolsInputSchema } from './ToolCreateWithoutToolGroupToolsInputSchema';
import { ToolUncheckedCreateWithoutToolGroupToolsInputSchema } from './ToolUncheckedCreateWithoutToolGroupToolsInputSchema';

export const ToolCreateOrConnectWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.ToolCreateOrConnectWithoutToolGroupToolsInput> = z.object({
  where: z.lazy(() => ToolWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ToolCreateWithoutToolGroupToolsInputSchema),z.lazy(() => ToolUncheckedCreateWithoutToolGroupToolsInputSchema) ]),
}).strict();

export default ToolCreateOrConnectWithoutToolGroupToolsInputSchema;
