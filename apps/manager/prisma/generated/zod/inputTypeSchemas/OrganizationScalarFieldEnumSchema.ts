import { z } from 'zod';

export const OrganizationScalarFieldEnumSchema = z.enum(['id','name','description','logoUrl','isDeleted','createdBy','createdAt','updatedAt']);

export default OrganizationScalarFieldEnumSchema;
