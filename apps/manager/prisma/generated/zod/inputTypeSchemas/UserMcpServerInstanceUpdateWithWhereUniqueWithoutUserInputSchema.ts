import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceUpdateWithoutUserInputSchema } from './UserMcpServerInstanceUpdateWithoutUserInputSchema';
import { UserMcpServerInstanceUncheckedUpdateWithoutUserInputSchema } from './UserMcpServerInstanceUncheckedUpdateWithoutUserInputSchema';

export const UserMcpServerInstanceUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerInstanceUpdateWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export default UserMcpServerInstanceUpdateWithWhereUniqueWithoutUserInputSchema;
