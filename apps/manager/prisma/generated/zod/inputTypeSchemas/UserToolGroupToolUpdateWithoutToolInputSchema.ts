import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { IntFieldUpdateOperationsInputSchema } from './IntFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserMcpServerConfigUpdateOneRequiredWithoutUserToolGroupToolsNestedInputSchema } from './UserMcpServerConfigUpdateOneRequiredWithoutUserToolGroupToolsNestedInputSchema';
import { UserToolGroupUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema } from './UserToolGroupUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema';

export const UserToolGroupToolUpdateWithoutToolInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateWithoutToolInput> = z.object({
  sortOrder: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userMcpServerConfig: z.lazy(() => UserMcpServerConfigUpdateOneRequiredWithoutUserToolGroupToolsNestedInputSchema).optional(),
  toolGroup: z.lazy(() => UserToolGroupUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema).optional()
}).strict();

export default UserToolGroupToolUpdateWithoutToolInputSchema;
