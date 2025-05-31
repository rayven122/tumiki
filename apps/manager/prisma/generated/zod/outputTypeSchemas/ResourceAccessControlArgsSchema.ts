import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ResourceAccessControlSelectSchema } from '../inputTypeSchemas/ResourceAccessControlSelectSchema';
import { ResourceAccessControlIncludeSchema } from '../inputTypeSchemas/ResourceAccessControlIncludeSchema';

export const ResourceAccessControlArgsSchema: z.ZodType<Prisma.ResourceAccessControlDefaultArgs> = z.object({
  select: z.lazy(() => ResourceAccessControlSelectSchema).optional(),
  include: z.lazy(() => ResourceAccessControlIncludeSchema).optional(),
}).strict();

export default ResourceAccessControlArgsSchema;
