import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { IntFieldUpdateOperationsInputSchema } from './IntFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserToolGroupUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema } from './UserToolGroupUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema';
import { ToolUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema } from './ToolUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema';

export const UserToolGroupToolUpdateWithoutUserMcpServerConfigInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateWithoutUserMcpServerConfigInput> = z.object({
  sortOrder: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  toolGroup: z.lazy(() => UserToolGroupUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema).optional(),
  tool: z.lazy(() => ToolUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema).optional()
}).strict();

export default UserToolGroupToolUpdateWithoutUserMcpServerConfigInputSchema;
