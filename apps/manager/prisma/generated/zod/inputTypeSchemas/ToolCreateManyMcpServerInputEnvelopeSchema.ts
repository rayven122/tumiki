import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolCreateManyMcpServerInputSchema } from './ToolCreateManyMcpServerInputSchema';

export const ToolCreateManyMcpServerInputEnvelopeSchema: z.ZodType<Prisma.ToolCreateManyMcpServerInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ToolCreateManyMcpServerInputSchema),z.lazy(() => ToolCreateManyMcpServerInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default ToolCreateManyMcpServerInputEnvelopeSchema;
