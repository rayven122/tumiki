import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserMcpServerInstanceUncheckedUpdateOneWithoutToolGroupNestedInputSchema } from './UserMcpServerInstanceUncheckedUpdateOneWithoutToolGroupNestedInputSchema';
import { UserToolGroupToolUncheckedUpdateManyWithoutToolGroupNestedInputSchema } from './UserToolGroupToolUncheckedUpdateManyWithoutToolGroupNestedInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupNestedInputSchema } from './UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupNestedInputSchema';

export const UserToolGroupUncheckedUpdateWithoutOrganizationInputSchema: z.ZodType<Prisma.UserToolGroupUncheckedUpdateWithoutOrganizationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isEnabled: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceUncheckedUpdateOneWithoutToolGroupNestedInputSchema).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolUncheckedUpdateManyWithoutToolGroupNestedInputSchema).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupNestedInputSchema).optional()
}).strict();

export default UserToolGroupUncheckedUpdateWithoutOrganizationInputSchema;
