import { z } from 'zod';

export const ResourceAccessControlScalarFieldEnumSchema = z.enum(['id','organizationId','resourceType','resourceId','memberId','groupId','allowedActions','deniedActions','createdAt','updatedAt']);

export default ResourceAccessControlScalarFieldEnumSchema;
