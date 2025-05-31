import { z } from 'zod';

export const UserMcpServerInstanceScalarFieldEnumSchema = z.enum(['id','name','description','iconPath','serverStatus','serverType','toolGroupId','userId','organizationId','createdAt','updatedAt']);

export default UserMcpServerInstanceScalarFieldEnumSchema;
