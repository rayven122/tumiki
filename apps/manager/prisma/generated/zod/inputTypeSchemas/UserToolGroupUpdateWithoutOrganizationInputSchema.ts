import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserMcpServerInstanceUpdateOneWithoutToolGroupNestedInputSchema } from './UserMcpServerInstanceUpdateOneWithoutToolGroupNestedInputSchema';
import { UserUpdateOneRequiredWithoutToolGroupsNestedInputSchema } from './UserUpdateOneRequiredWithoutToolGroupsNestedInputSchema';
import { UserToolGroupToolUpdateManyWithoutToolGroupNestedInputSchema } from './UserToolGroupToolUpdateManyWithoutToolGroupNestedInputSchema';
import { UserMcpServerInstanceToolGroupUpdateManyWithoutToolGroupNestedInputSchema } from './UserMcpServerInstanceToolGroupUpdateManyWithoutToolGroupNestedInputSchema';

export const UserToolGroupUpdateWithoutOrganizationInputSchema: z.ZodType<Prisma.UserToolGroupUpdateWithoutOrganizationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isEnabled: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceUpdateOneWithoutToolGroupNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutToolGroupsNestedInputSchema).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolUpdateManyWithoutToolGroupNestedInputSchema).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupUpdateManyWithoutToolGroupNestedInputSchema).optional()
}).strict();

export default UserToolGroupUpdateWithoutOrganizationInputSchema;
