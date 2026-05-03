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
  vi.unstubAllEnvs();
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
    if (!createArgs) throw new Error("user.createが呼び出されませんでした");

    expect(createArgs.data.id).toStrictEqual(input.id);
    expect(createArgs.data.role).toStrictEqual(Role.SYSTEM_ADMIN);
    expect(result.role).toStrictEqual(Role.SYSTEM_ADMIN);
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
    if (!createArgs) throw new Error("user.createが呼び出されませんでした");

    expect(createArgs.data.id).toStrictEqual("user-002");
    expect(createArgs.data.role).toStrictEqual(Role.USER);
    expect(result.role).toStrictEqual(Role.USER);
  });

  test("bootstrap管理者メールに一致するユーザーをSYSTEM_ADMINとして作成する", async () => {
    vi.stubEnv("INTERNAL_MANAGER_BOOTSTRAP_ADMIN_EMAIL", "ADMIN@EXAMPLE.COM");
    mockDb.user.count.mockResolvedValue(1);
    mockDb.user.create.mockResolvedValue(
      buildCreatedUser({
        id: "user-admin",
        email: "admin@example.com",
        role: Role.SYSTEM_ADMIN,
      }),
    );

    const result = await createUser(buildDb(), {
      ...input,
      id: "user-admin",
      email: "admin@example.com",
    });
    const createArgs = mockDb.user.create.mock.calls[0]?.[0];
    if (!createArgs) throw new Error("user.createが呼び出されませんでした");

    expect(createArgs.data.role).toStrictEqual(Role.SYSTEM_ADMIN);
    expect(result.role).toStrictEqual(Role.SYSTEM_ADMIN);
  });

  test("bootstrap管理者メールに一致しないユーザーは2人目以降USERとして作成する", async () => {
    vi.stubEnv("INTERNAL_MANAGER_BOOTSTRAP_ADMIN_EMAIL", "admin@example.com");
    mockDb.user.count.mockResolvedValue(1);
    mockDb.user.create.mockResolvedValue(
      buildCreatedUser({
        id: "user-regular",
        email: "regular@example.com",
        role: Role.USER,
      }),
    );

    const result = await createUser(buildDb(), {
      ...input,
      id: "user-regular",
      email: "regular@example.com",
    });
    const createArgs = mockDb.user.create.mock.calls[0]?.[0];
    if (!createArgs) throw new Error("user.createが呼び出されませんでした");

    expect(createArgs.data.role).toStrictEqual(Role.USER);
    expect(result.role).toStrictEqual(Role.USER);
  });

  test("productionではbootstrap管理者メールに一致してもUSERとして作成する", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INTERNAL_MANAGER_BOOTSTRAP_ADMIN_EMAIL", "admin@example.com");
    mockDb.user.count.mockResolvedValue(1);
    mockDb.user.create.mockResolvedValue(
      buildCreatedUser({
        id: "user-prod",
        email: "admin@example.com",
        role: Role.USER,
      }),
    );

    const result = await createUser(buildDb(), {
      ...input,
      id: "user-prod",
      email: "admin@example.com",
    });
    const createArgs = mockDb.user.create.mock.calls[0]?.[0];
    if (!createArgs) throw new Error("user.createが呼び出されませんでした");

    expect(createArgs.data.role).toStrictEqual(Role.USER);
    expect(result.role).toStrictEqual(Role.USER);
  });

  test("stagingではbootstrap管理者メールに一致してもUSERとして作成する", async () => {
    vi.stubEnv("NODE_ENV", "staging");
    vi.stubEnv("INTERNAL_MANAGER_BOOTSTRAP_ADMIN_EMAIL", "admin@example.com");
    mockDb.user.count.mockResolvedValue(1);
    mockDb.user.create.mockResolvedValue(
      buildCreatedUser({
        id: "user-staging",
        email: "admin@example.com",
        role: Role.USER,
      }),
    );

    const result = await createUser(buildDb(), {
      ...input,
      id: "user-staging",
      email: "admin@example.com",
    });
    const createArgs = mockDb.user.create.mock.calls[0]?.[0];
    if (!createArgs) throw new Error("user.createが呼び出されませんでした");

    expect(createArgs.data.role).toStrictEqual(Role.USER);
    expect(result.role).toStrictEqual(Role.USER);
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
