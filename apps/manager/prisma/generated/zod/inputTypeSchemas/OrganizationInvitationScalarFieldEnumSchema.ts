import { z } from 'zod';

export const OrganizationInvitationScalarFieldEnumSchema = z.enum(['id','organizationId','email','token','invitedBy','isAdmin','roleIds','groupIds','expires','createdAt','updatedAt']);

export default OrganizationInvitationScalarFieldEnumSchema;
