import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigSelectSchema } from '../inputTypeSchemas/UserMcpServerConfigSelectSchema';
import { UserMcpServerConfigIncludeSchema } from '../inputTypeSchemas/UserMcpServerConfigIncludeSchema';

export const UserMcpServerConfigArgsSchema: z.ZodType<Prisma.UserMcpServerConfigDefaultArgs> = z.object({
  select: z.lazy(() => UserMcpServerConfigSelectSchema).optional(),
  include: z.lazy(() => UserMcpServerConfigIncludeSchema).optional(),
}).strict();

export default UserMcpServerConfigArgsSchema;
