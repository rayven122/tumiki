import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceSelectSchema } from '../inputTypeSchemas/UserMcpServerInstanceSelectSchema';
import { UserMcpServerInstanceIncludeSchema } from '../inputTypeSchemas/UserMcpServerInstanceIncludeSchema';

export const UserMcpServerInstanceArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceDefaultArgs> = z.object({
  select: z.lazy(() => UserMcpServerInstanceSelectSchema).optional(),
  include: z.lazy(() => UserMcpServerInstanceIncludeSchema).optional(),
}).strict();

export default UserMcpServerInstanceArgsSchema;
