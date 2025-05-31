import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupSelectSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupSelectSchema';
import { UserMcpServerInstanceToolGroupIncludeSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupIncludeSchema';

export const UserMcpServerInstanceToolGroupArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupDefaultArgs> = z.object({
  select: z.lazy(() => UserMcpServerInstanceToolGroupSelectSchema).optional(),
  include: z.lazy(() => UserMcpServerInstanceToolGroupIncludeSchema).optional(),
}).strict();

export default UserMcpServerInstanceToolGroupArgsSchema;
