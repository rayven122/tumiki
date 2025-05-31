import { z } from 'zod';

export const OrganizationRoleScalarFieldEnumSchema = z.enum(['id','name','description','organizationId','isDefault','createdAt','updatedAt']);

export default OrganizationRoleScalarFieldEnumSchema;
