import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ResourceAccessControlIncludeSchema } from '../inputTypeSchemas/ResourceAccessControlIncludeSchema'
import { ResourceAccessControlWhereUniqueInputSchema } from '../inputTypeSchemas/ResourceAccessControlWhereUniqueInputSchema'
import { ResourceAccessControlCreateInputSchema } from '../inputTypeSchemas/ResourceAccessControlCreateInputSchema'
import { ResourceAccessControlUncheckedCreateInputSchema } from '../inputTypeSchemas/ResourceAccessControlUncheckedCreateInputSchema'
import { ResourceAccessControlUpdateInputSchema } from '../inputTypeSchemas/ResourceAccessControlUpdateInputSchema'
import { ResourceAccessControlUncheckedUpdateInputSchema } from '../inputTypeSchemas/ResourceAccessControlUncheckedUpdateInputSchema'
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { OrganizationMemberArgsSchema } from "../outputTypeSchemas/OrganizationMemberArgsSchema"
import { OrganizationGroupArgsSchema } from "../outputTypeSchemas/OrganizationGroupArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const ResourceAccessControlSelectSchema: z.ZodType<Prisma.ResourceAccessControlSelect> = z.object({
  id: z.boolean().optional(),
  organizationId: z.boolean().optional(),
  resourceType: z.boolean().optional(),
  resourceId: z.boolean().optional(),
  memberId: z.boolean().optional(),
  groupId: z.boolean().optional(),
  allowedActions: z.boolean().optional(),
  deniedActions: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  member: z.union([z.boolean(),z.lazy(() => OrganizationMemberArgsSchema)]).optional(),
  group: z.union([z.boolean(),z.lazy(() => OrganizationGroupArgsSchema)]).optional(),
}).strict()

export const ResourceAccessControlUpsertArgsSchema: z.ZodType<Prisma.ResourceAccessControlUpsertArgs> = z.object({
  select: ResourceAccessControlSelectSchema.optional(),
  include: z.lazy(() => ResourceAccessControlIncludeSchema).optional(),
  where: ResourceAccessControlWhereUniqueInputSchema,
  create: z.union([ ResourceAccessControlCreateInputSchema,ResourceAccessControlUncheckedCreateInputSchema ]),
  update: z.union([ ResourceAccessControlUpdateInputSchema,ResourceAccessControlUncheckedUpdateInputSchema ]),
}).strict() ;

export default ResourceAccessControlUpsertArgsSchema;
