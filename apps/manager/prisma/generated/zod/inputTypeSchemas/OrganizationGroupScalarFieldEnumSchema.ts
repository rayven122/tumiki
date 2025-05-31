import { z } from 'zod';

export const OrganizationGroupScalarFieldEnumSchema = z.enum(['id','name','description','organizationId','createdAt','updatedAt']);

export default OrganizationGroupScalarFieldEnumSchema;
