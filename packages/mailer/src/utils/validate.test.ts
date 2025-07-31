import { describe, expect, test } from "vitest";

import { normalizeEmailList, validateEmail, validateEmails } from "./validate";

describe("validateEmail", () => {
  test("正常系: 標準的なメールアドレスを検証できる", () => {
    expect(validateEmail("test@example.com")).toStrictEqual(true);
  });

  test("正常系: ドメインにハイフンを含むメールアドレスを検証できる", () => {
    expect(validateEmail("user@example-domain.com")).toStrictEqual(true);
  });

  test("正常系: ユーザー名に数字を含むメールアドレスを検証できる", () => {
    expect(validateEmail("user123@example.com")).toStrictEqual(true);
  });

  test("正常系: ユーザー名にドットを含むメールアドレスを検証できる", () => {
    expect(validateEmail("first.last@example.com")).toStrictEqual(true);
  });

  test("正常系: ユーザー名にアンダースコアを含むメールアドレスを検証できる", () => {
    expect(validateEmail("first_last@example.com")).toStrictEqual(true);
  });

  test("正常系: サブドメインを含むメールアドレスを検証できる", () => {
    expect(validateEmail("user@mail.example.com")).toStrictEqual(true);
  });

  test("正常系: 複数レベルのサブドメインを含むメールアドレスを検証できる", () => {
    expect(validateEmail("user@sub.mail.example.com")).toStrictEqual(true);
  });

  test("異常系: @マークがないメールアドレスは無効", () => {
    expect(validateEmail("userexample.com")).toStrictEqual(false);
  });

  test("異常系: ドメイン部分がないメールアドレスは無効", () => {
    expect(validateEmail("user@")).toStrictEqual(false);
  });

  test("異常系: ユーザー名部分がないメールアドレスは無効", () => {
    expect(validateEmail("@example.com")).toStrictEqual(false);
  });

  test("異常系: ドットがないドメインは無効", () => {
    expect(validateEmail("user@example")).toStrictEqual(false);
  });

  test("異常系: 複数の@マークを含むメールアドレスは無効", () => {
    expect(validateEmail("user@@example.com")).toStrictEqual(false);
  });

  test("異常系: スペースを含むメールアドレスは無効", () => {
    expect(validateEmail("user @example.com")).toStrictEqual(false);
  });

  test("異常系: ユーザー名の前にスペースがあるメールアドレスは無効", () => {
    expect(validateEmail(" user@example.com")).toStrictEqual(false);
  });

  test("異常系: ドメインの後にスペースがあるメールアドレスは無効", () => {
    expect(validateEmail("user@example.com ")).toStrictEqual(false);
  });

  test("異常系: 空文字列は無効", () => {
    expect(validateEmail("")).toStrictEqual(false);
  });

  test("異常系: @マークで始まるメールアドレスは無効", () => {
    expect(validateEmail("@user.example.com")).toStrictEqual(false);
  });

  test("異常系: ドットで終わるドメインは無効", () => {
    expect(validateEmail("user@example.")).toStrictEqual(false);
  });

  test("正常系: ドットで始まるドメインも有効と判定される", () => {
    expect(validateEmail("user@.example.com")).toStrictEqual(true);
  });
});

describe("validateEmails", () => {
  test("正常系: すべて有効なメールアドレスの配列はtrueを返す", () => {
    const emails = [
      "user1@example.com",
      "user2@example.com",
      "user3@example.com",
    ];
    expect(validateEmails(emails)).toStrictEqual(true);
  });

  test("正常系: 単一の有効なメールアドレスの配列はtrueを返す", () => {
    expect(validateEmails(["user@example.com"])).toStrictEqual(true);
  });

  test("正常系: 空配列はtrueを返す", () => {
    expect(validateEmails([])).toStrictEqual(true);
  });

  test("異常系: 一つでも無効なメールアドレスを含む配列はfalseを返す", () => {
    const emails = ["user1@example.com", "invalid-email", "user3@example.com"];
    expect(validateEmails(emails)).toStrictEqual(false);
  });

  test("異常系: すべて無効なメールアドレスの配列はfalseを返す", () => {
    const emails = ["invalid-email1", "invalid-email2", "invalid-email3"];
    expect(validateEmails(emails)).toStrictEqual(false);
  });

  test("異常系: 最初のメールアドレスが無効な場合はfalseを返す", () => {
    const emails = ["invalid-email", "user2@example.com", "user3@example.com"];
    expect(validateEmails(emails)).toStrictEqual(false);
  });

  test("異常系: 最後のメールアドレスが無効な場合はfalseを返す", () => {
    const emails = ["user1@example.com", "user2@example.com", "invalid-email"];
    expect(validateEmails(emails)).toStrictEqual(false);
  });

  test("異常系: 空文字列を含む配列はfalseを返す", () => {
    const emails = ["user1@example.com", "", "user3@example.com"];
    expect(validateEmails(emails)).toStrictEqual(false);
  });
});

describe("normalizeEmailList", () => {
  test("正常系: 文字列を配列に変換する", () => {
    expect(normalizeEmailList("user@example.com")).toStrictEqual([
      "user@example.com",
    ]);
  });

  test("正常系: 配列はそのまま返す", () => {
    const emails = ["user1@example.com", "user2@example.com"];
    expect(normalizeEmailList(emails)).toStrictEqual(emails);
  });

  test("正常系: 空の配列はそのまま返す", () => {
    expect(normalizeEmailList([])).toStrictEqual([]);
  });

  test("境界値: 空文字列はundefinedを返す", () => {
    expect(normalizeEmailList("")).toStrictEqual(undefined);
  });

  test("境界値: undefinedはundefinedを返す", () => {
    expect(normalizeEmailList(undefined)).toStrictEqual(undefined);
  });

  test("境界値: nullはundefinedを返す", () => {
    expect(
      normalizeEmailList(null as unknown as string | string[] | undefined),
    ).toStrictEqual(undefined);
  });

  test("境界値: 0はundefinedを返す", () => {
    expect(
      normalizeEmailList(0 as unknown as string | string[] | undefined),
    ).toStrictEqual(undefined);
  });

  test("境界値: falseはundefinedを返す", () => {
    expect(
      normalizeEmailList(false as unknown as string | string[] | undefined),
    ).toStrictEqual(undefined);
  });

  test("正常系: 単一要素の配列はそのまま返す", () => {
    expect(normalizeEmailList(["single@example.com"])).toStrictEqual([
      "single@example.com",
    ]);
  });

  test("正常系: 複数要素の配列はそのまま返す", () => {
    const emails = [
      "user1@example.com",
      "user2@example.com",
      "user3@example.com",
    ];
    expect(normalizeEmailList(emails)).toStrictEqual(emails);
  });

  test("正常系: 無効なメールアドレスの文字列も配列に変換する", () => {
    expect(normalizeEmailList("invalid-email")).toStrictEqual([
      "invalid-email",
    ]);
  });

  test("正常系: 無効なメールアドレスを含む配列もそのまま返す", () => {
    const emails = ["valid@example.com", "invalid-email"];
    expect(normalizeEmailList(emails)).toStrictEqual(emails);
  });
});
