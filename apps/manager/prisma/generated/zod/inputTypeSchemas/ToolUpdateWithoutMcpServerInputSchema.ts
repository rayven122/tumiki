import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { JsonNullValueInputSchema } from './JsonNullValueInputSchema';
import { InputJsonValueSchema } from './InputJsonValueSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserMcpServerConfigUpdateManyWithoutToolsNestedInputSchema } from './UserMcpServerConfigUpdateManyWithoutToolsNestedInputSchema';
import { UserToolGroupToolUpdateManyWithoutToolNestedInputSchema } from './UserToolGroupToolUpdateManyWithoutToolNestedInputSchema';

export const ToolUpdateWithoutMcpServerInputSchema: z.ZodType<Prisma.ToolUpdateWithoutMcpServerInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  inputSchema: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValueSchema ]).optional(),
  isEnabled: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigUpdateManyWithoutToolsNestedInputSchema).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolUpdateManyWithoutToolNestedInputSchema).optional()
}).strict();

export default ToolUpdateWithoutMcpServerInputSchema;
