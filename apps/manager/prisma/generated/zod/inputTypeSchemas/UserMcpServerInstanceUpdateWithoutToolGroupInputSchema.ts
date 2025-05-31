import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { ServerStatusSchema } from './ServerStatusSchema';
import { EnumServerStatusFieldUpdateOperationsInputSchema } from './EnumServerStatusFieldUpdateOperationsInputSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { EnumServerTypeFieldUpdateOperationsInputSchema } from './EnumServerTypeFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserMcpServerInstanceToolGroupUpdateManyWithoutMcpServerInstanceNestedInputSchema } from './UserMcpServerInstanceToolGroupUpdateManyWithoutMcpServerInstanceNestedInputSchema';
import { UserUpdateOneRequiredWithoutMcpServerInstancesNestedInputSchema } from './UserUpdateOneRequiredWithoutMcpServerInstancesNestedInputSchema';
import { OrganizationUpdateOneWithoutMcpServerInstancesNestedInputSchema } from './OrganizationUpdateOneWithoutMcpServerInstancesNestedInputSchema';

export const UserMcpServerInstanceUpdateWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpdateWithoutToolGroupInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  iconPath: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  serverStatus: z.union([ z.lazy(() => ServerStatusSchema),z.lazy(() => EnumServerStatusFieldUpdateOperationsInputSchema) ]).optional(),
  serverType: z.union([ z.lazy(() => ServerTypeSchema),z.lazy(() => EnumServerTypeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupUpdateManyWithoutMcpServerInstanceNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutMcpServerInstancesNestedInputSchema).optional(),
  organization: z.lazy(() => OrganizationUpdateOneWithoutMcpServerInstancesNestedInputSchema).optional()
}).strict();

export default UserMcpServerInstanceUpdateWithoutToolGroupInputSchema;
