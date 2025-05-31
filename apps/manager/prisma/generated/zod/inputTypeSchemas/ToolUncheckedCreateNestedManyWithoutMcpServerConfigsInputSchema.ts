import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolCreateWithoutMcpServerConfigsInputSchema } from './ToolCreateWithoutMcpServerConfigsInputSchema';
import { ToolUncheckedCreateWithoutMcpServerConfigsInputSchema } from './ToolUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { ToolCreateOrConnectWithoutMcpServerConfigsInputSchema } from './ToolCreateOrConnectWithoutMcpServerConfigsInputSchema';
import { ToolWhereUniqueInputSchema } from './ToolWhereUniqueInputSchema';

export const ToolUncheckedCreateNestedManyWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.ToolUncheckedCreateNestedManyWithoutMcpServerConfigsInput> = z.object({
  create: z.union([ z.lazy(() => ToolCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolCreateWithoutMcpServerConfigsInputSchema).array(),z.lazy(() => ToolUncheckedCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolUncheckedCreateWithoutMcpServerConfigsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ToolCreateOrConnectWithoutMcpServerConfigsInputSchema),z.lazy(() => ToolCreateOrConnectWithoutMcpServerConfigsInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ToolWhereUniqueInputSchema),z.lazy(() => ToolWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default ToolUncheckedCreateNestedManyWithoutMcpServerConfigsInputSchema;
