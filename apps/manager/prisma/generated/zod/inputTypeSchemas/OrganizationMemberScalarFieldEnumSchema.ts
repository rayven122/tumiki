import { z } from 'zod';

export const OrganizationMemberScalarFieldEnumSchema = z.enum(['id','organizationId','userId','isAdmin','createdAt','updatedAt']);

export default OrganizationMemberScalarFieldEnumSchema;
