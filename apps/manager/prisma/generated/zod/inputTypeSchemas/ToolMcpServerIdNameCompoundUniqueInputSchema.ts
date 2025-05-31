import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const ToolMcpServerIdNameCompoundUniqueInputSchema: z.ZodType<Prisma.ToolMcpServerIdNameCompoundUniqueInput> = z.object({
  mcpServerId: z.string(),
  name: z.string()
}).strict();

export default ToolMcpServerIdNameCompoundUniqueInputSchema;
