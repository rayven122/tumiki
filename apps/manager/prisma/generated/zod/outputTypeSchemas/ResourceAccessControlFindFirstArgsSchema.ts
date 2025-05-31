import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ResourceAccessControlIncludeSchema } from '../inputTypeSchemas/ResourceAccessControlIncludeSchema'
import { ResourceAccessControlWhereInputSchema } from '../inputTypeSchemas/ResourceAccessControlWhereInputSchema'
import { ResourceAccessControlOrderByWithRelationInputSchema } from '../inputTypeSchemas/ResourceAccessControlOrderByWithRelationInputSchema'
import { ResourceAccessControlWhereUniqueInputSchema } from '../inputTypeSchemas/ResourceAccessControlWhereUniqueInputSchema'
import { ResourceAccessControlScalarFieldEnumSchema } from '../inputTypeSchemas/ResourceAccessControlScalarFieldEnumSchema'
import { OrganizationArgsSchema } from "./OrganizationArgsSchema"
import { OrganizationMemberArgsSchema } from "./OrganizationMemberArgsSchema"
import { OrganizationGroupArgsSchema } from "./OrganizationGroupArgsSchema"
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

export const ResourceAccessControlFindFirstArgsSchema: z.ZodType<Prisma.ResourceAccessControlFindFirstArgs> = z.object({
  select: ResourceAccessControlSelectSchema.optional(),
  include: z.lazy(() => ResourceAccessControlIncludeSchema).optional(),
  where: ResourceAccessControlWhereInputSchema.optional(),
  orderBy: z.union([ ResourceAccessControlOrderByWithRelationInputSchema.array(),ResourceAccessControlOrderByWithRelationInputSchema ]).optional(),
  cursor: ResourceAccessControlWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ResourceAccessControlScalarFieldEnumSchema,ResourceAccessControlScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export default ResourceAccessControlFindFirstArgsSchema;
