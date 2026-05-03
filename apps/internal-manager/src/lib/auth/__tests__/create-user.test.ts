/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, test, vi, beforeEach } from "vitest";
import { Role, type PrismaTransactionClient } from "@tumiki/internal-db";
import { createUser, type CreateUserInput } from "../create-user";

const input: CreateUserInput = {
  id: "user-001",
  email: "first@example.com",
  name: "First User",
  emailVerified: null,
  image: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fn = () => vi.fn<any>();

const mockDb = {
  user: {
    count: fn(),
    create: fn(),
  },
};

const buildDb = () => mockDb as unknown as PrismaTransactionClient;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createUser", () => {
  test("初回ユーザーをSYSTEM_ADMINとして作成する", async () => {
    mockDb.user.count.mockResolvedValue(0);
    mockDb.user.create.mockResolvedValue({
      ...input,
      role: Role.SYSTEM_ADMIN,
    });

    const result = await createUser(buildDb(), input);

    expect(mockDb.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: input.id,
        role: Role.SYSTEM_ADMIN,
      }),
    });
    expect(result.role).toBe(Role.SYSTEM_ADMIN);
  });

  test("2人目以降のユーザーをUSERとして作成する", async () => {
    mockDb.user.count.mockResolvedValue(1);
    mockDb.user.create.mockResolvedValue({
      ...input,
      id: "user-002",
      email: "second@example.com",
      role: Role.USER,
    });

    const result = await createUser(buildDb(), {
      ...input,
      id: "user-002",
      email: "second@example.com",
    });

    expect(mockDb.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "user-002",
        role: Role.USER,
      }),
    });
    expect(result.role).toBe(Role.USER);
  });
});
