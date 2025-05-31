import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolCreateWithoutToolGroupToolsInputSchema } from './ToolCreateWithoutToolGroupToolsInputSchema';
import { ToolUncheckedCreateWithoutToolGroupToolsInputSchema } from './ToolUncheckedCreateWithoutToolGroupToolsInputSchema';
import { ToolCreateOrConnectWithoutToolGroupToolsInputSchema } from './ToolCreateOrConnectWithoutToolGroupToolsInputSchema';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';

export const ToolCreateNestedOneWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.ToolCreateNestedOneWithoutToolGroupToolsInput> = z.object({
  create: z.union([ z.lazy(() => ToolCreateWithoutToolGroupToolsInputSchema),z.lazy(() => ToolUncheckedCreateWithoutToolGroupToolsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ToolCreateOrConnectWithoutToolGroupToolsInputSchema).optional(),
  connect: z.lazy(() => ToolWhereUniqueInputSchema).optional()
}).strict();

export default ToolCreateNestedOneWithoutToolGroupToolsInputSchema;
