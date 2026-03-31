import { describe, test, expect, beforeEach, vi } from "vitest";
import * as authRepository from "../auth.repository";

describe("auth.repository", () => {
  const mockAuthToken = {
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockDb = {
    authToken: mockAuthToken,
  } as unknown as Parameters<typeof authRepository.findLatest>[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findLatest", () => {
    test("作成日時の降順で最初のトークンを取得する", async () => {
      const mockToken = {
        id: 1,
        accessToken: "encrypted-token",
        refreshToken: "encrypted-refresh",
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAuthToken.findFirst.mockResolvedValue(mockToken);

      const result = await authRepository.findLatest(mockDb);

      expect(result).toStrictEqual(mockToken);
      expect(mockAuthToken.findFirst).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
    });

    test("トークンが存在しない場合はnullを返す", async () => {
      mockAuthToken.findFirst.mockResolvedValue(null);

      const result = await authRepository.findLatest(mockDb);

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    test("認証トークンを作成する", async () => {
      const data = {
        accessToken: "encrypted-access",
        refreshToken: "encrypted-refresh",
        expiresAt: new Date(),
      };
      const mockCreated = {
        id: 1,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAuthToken.create.mockResolvedValue(mockCreated);

      const result = await authRepository.create(mockDb, data);

      expect(result).toStrictEqual(mockCreated);
      expect(mockAuthToken.create).toHaveBeenCalledWith({ data });
    });
  });

  describe("deleteById", () => {
    test("指定IDのトークンを削除する", async () => {
      const mockDeleted = { id: 1 };
      mockAuthToken.delete.mockResolvedValue(mockDeleted);

      const result = await authRepository.deleteById(mockDb, 1);

      expect(result).toStrictEqual(mockDeleted);
      expect(mockAuthToken.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe("deleteAll", () => {
    test("すべてのトークンを削除する", async () => {
      mockAuthToken.deleteMany.mockResolvedValue({ count: 3 });

      const result = await authRepository.deleteAll(mockDb);

      expect(result).toStrictEqual({ count: 3 });
      expect(mockAuthToken.deleteMany).toHaveBeenCalledWith({});
    });
  });

  describe("deleteAllExcept", () => {
    test("指定ID以外のすべてのトークンを削除する", async () => {
      mockAuthToken.deleteMany.mockResolvedValue({ count: 2 });

      const result = await authRepository.deleteAllExcept(mockDb, 5);

      expect(result).toStrictEqual({ count: 2 });
      expect(mockAuthToken.deleteMany).toHaveBeenCalledWith({
        where: { id: { not: 5 } },
      });
    });
  });
});
