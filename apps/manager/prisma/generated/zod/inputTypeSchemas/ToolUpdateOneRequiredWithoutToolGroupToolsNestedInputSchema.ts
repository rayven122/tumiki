import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolCreateWithoutToolGroupToolsInputSchema } from './ToolCreateWithoutToolGroupToolsInputSchema';
import { ToolUncheckedCreateWithoutToolGroupToolsInputSchema } from './ToolUncheckedCreateWithoutToolGroupToolsInputSchema';
import { ToolCreateOrConnectWithoutToolGroupToolsInputSchema } from './ToolCreateOrConnectWithoutToolGroupToolsInputSchema';
import { ToolUpsertWithoutToolGroupToolsInputSchema } from './ToolUpsertWithoutToolGroupToolsInputSchema';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';
import { ToolUpdateToOneWithWhereWithoutToolGroupToolsInputSchema } from './ToolUpdateToOneWithWhereWithoutToolGroupToolsInputSchema';
import { ToolUpdateWithoutToolGroupToolsInputSchema } from './ToolUpdateWithoutToolGroupToolsInputSchema';
import { ToolUncheckedUpdateWithoutToolGroupToolsInputSchema } from './ToolUncheckedUpdateWithoutToolGroupToolsInputSchema';

export const ToolUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema: z.ZodType<Prisma.ToolUpdateOneRequiredWithoutToolGroupToolsNestedInput> = z.object({
  create: z.union([ z.lazy(() => ToolCreateWithoutToolGroupToolsInputSchema),z.lazy(() => ToolUncheckedCreateWithoutToolGroupToolsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => ToolCreateOrConnectWithoutToolGroupToolsInputSchema).optional(),
  upsert: z.lazy(() => ToolUpsertWithoutToolGroupToolsInputSchema).optional(),
  connect: z.lazy(() => ToolWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => ToolUpdateToOneWithWhereWithoutToolGroupToolsInputSchema),z.lazy(() => ToolUpdateWithoutToolGroupToolsInputSchema),z.lazy(() => ToolUncheckedUpdateWithoutToolGroupToolsInputSchema) ]).optional(),
}).strict();

export default ToolUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema;
