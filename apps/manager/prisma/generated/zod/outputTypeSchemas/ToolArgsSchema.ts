import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolSelectSchema } from '../inputTypeSchemas/ToolSelectSchema';
import { ToolIncludeSchema } from '../inputTypeSchemas/ToolIncludeSchema';

export const ToolArgsSchema: z.ZodType<Prisma.ToolDefaultArgs> = z.object({
  select: z.lazy(() => ToolSelectSchema).optional(),
  include: z.lazy(() => ToolIncludeSchema).optional(),
}).strict();

export default ToolArgsSchema;
