import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { ToolUncheckedUpdateManyWithoutMcpServerConfigsNestedInputSchema } from './ToolUncheckedUpdateManyWithoutMcpServerConfigsNestedInputSchema';
import { UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigNestedInputSchema } from './UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigNestedInputSchema';

export const UserMcpServerConfigUncheckedUpdateWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerConfigUncheckedUpdateWithoutOrganizationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  envVars: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  mcpServerId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tools: z.lazy(() => ToolUncheckedUpdateManyWithoutMcpServerConfigsNestedInputSchema).optional(),
  userToolGroupTools: z.lazy(() => UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigNestedInputSchema).optional()
}).strict();

export default UserMcpServerConfigUncheckedUpdateWithoutOrganizationInputSchema;
