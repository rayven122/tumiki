import { z } from 'zod';

export const RolePermissionScalarFieldEnumSchema = z.enum(['id','roleId','resourceType','action','createdAt','updatedAt']);

export default RolePermissionScalarFieldEnumSchema;
