import { z } from 'zod';

export const UserToolGroupScalarFieldEnumSchema = z.enum(['id','name','description','isEnabled','userId','organizationId','createdAt','updatedAt']);

export default UserToolGroupScalarFieldEnumSchema;
