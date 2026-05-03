import { describe, expect, test, vi, beforeEach } from "vitest";
import { Role, type PrismaTransactionClient } from "@tumiki/internal-db";
import {
  createUser,
  type CreateUserInput,
  type CreateUserOutput,
} from "../create-user";

const input: CreateUserInput = {
  id: "user-001",
  email: "first@example.com",
  name: "First User",
  emailVerified: null,
  image: null,
};

type DbCreatedUser = Omit<CreateUserOutput, "email"> & {
  email: string | null;
};

type CreateUserArgs = {
  data: {
    id: string;
    name: string | null;
    email: string;
    emailVerified: Date | null;
    image: string | null;
    role: Role;
  };
};

const mockDb = {
  user: {
    count: vi.fn<() => Promise<number>>(),
    create: vi.fn<(args: CreateUserArgs) => Promise<DbCreatedUser>>(),
  },
};

const buildDb = () => mockDb as unknown as PrismaTransactionClient;

const buildCreatedUser = (
  overrides: Partial<DbCreatedUser>,
): DbCreatedUser => ({
  id: input.id,
  email: input.email,
  emailVerified: null,
  role: Role.USER,
  name: input.name,
  image: null,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createUser", () => {
  test("初回ユーザーをSYSTEM_ADMINとして作成する", async () => {
    mockDb.user.count.mockResolvedValue(0);
    mockDb.user.create.mockResolvedValue(
      buildCreatedUser({
        role: Role.SYSTEM_ADMIN,
      }),
    );

    const result = await createUser(buildDb(), input);
    const createArgs = mockDb.user.create.mock.calls[0]?.[0];

    expect(createArgs?.data.id).toStrictEqual(input.id);
    expect(createArgs?.data.role).toStrictEqual(Role.SYSTEM_ADMIN);
    expect(result.role).toBe(Role.SYSTEM_ADMIN);
  });

  test("2人目以降のユーザーをUSERとして作成する", async () => {
    mockDb.user.count.mockResolvedValue(1);
    mockDb.user.create.mockResolvedValue(
      buildCreatedUser({
        id: "user-002",
        email: "second@example.com",
        role: Role.USER,
      }),
    );

    const result = await createUser(buildDb(), {
      ...input,
      id: "user-002",
      email: "second@example.com",
    });
    const createArgs = mockDb.user.create.mock.calls[0]?.[0];

    expect(createArgs?.data.id).toStrictEqual("user-002");
    expect(createArgs?.data.role).toStrictEqual(Role.USER);
    expect(result.role).toBe(Role.USER);
  });

  test("emailがnullの場合にエラーをスローする", async () => {
    mockDb.user.count.mockResolvedValue(0);
    mockDb.user.create.mockResolvedValue(
      buildCreatedUser({
        email: null,
        role: Role.SYSTEM_ADMIN,
      }),
    );

    await expect(createUser(buildDb(), input)).rejects.toThrow(
      "データベースのメールアドレスがnull",
    );
  });
});
