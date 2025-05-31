import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { ToolUpdateManyWithoutMcpServerConfigsNestedInputSchema } from './ToolUpdateManyWithoutMcpServerConfigsNestedInputSchema';
import { UserToolGroupToolUpdateManyWithoutUserMcpServerConfigNestedInputSchema } from './UserToolGroupToolUpdateManyWithoutUserMcpServerConfigNestedInputSchema';
import { McpServerUpdateOneRequiredWithoutMcpServerConfigsNestedInputSchema } from './McpServerUpdateOneRequiredWithoutMcpServerConfigsNestedInputSchema';
import { OrganizationUpdateOneWithoutMcpServerConfigsNestedInputSchema } from './OrganizationUpdateOneWithoutMcpServerConfigsNestedInputSchema';

export const UserMcpServerConfigUpdateWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  envVars: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tools: z.lazy(() => ToolUpdateManyWithoutMcpServerConfigsNestedInputSchema).optional(),
  userToolGroupTools: z.lazy(() => UserToolGroupToolUpdateManyWithoutUserMcpServerConfigNestedInputSchema).optional(),
  mcpServer: z.lazy(() => McpServerUpdateOneRequiredWithoutMcpServerConfigsNestedInputSchema).optional(),
  organization: z.lazy(() => OrganizationUpdateOneWithoutMcpServerConfigsNestedInputSchema).optional()
}).strict();

export default UserMcpServerConfigUpdateWithoutUserInputSchema;
