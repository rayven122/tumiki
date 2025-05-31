import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolCountOutputTypeSelectSchema } from './ToolCountOutputTypeSelectSchema';

export const ToolCountOutputTypeArgsSchema: z.ZodType<Prisma.ToolCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => ToolCountOutputTypeSelectSchema).nullish(),
}).strict();

export default ToolCountOutputTypeSelectSchema;
