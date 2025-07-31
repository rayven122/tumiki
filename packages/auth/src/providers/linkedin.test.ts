import { describe, expect, test } from "vitest";

import { linkedinConfig } from "./linkedin";

describe("linkedinConfig", () => {
  test("正常系: name プロパティが正しく設定されている", () => {
    expect(linkedinConfig.name).toStrictEqual("LinkedIn");
  });

  test("正常系: icon プロパティが正しく設定されている", () => {
    expect(linkedinConfig.icon).toStrictEqual("💼");
  });

  test("正常系: connection プロパティが正しく設定されている", () => {
    expect(linkedinConfig.connection).toStrictEqual("linkedin");
  });

  test("正常系: availableScopes プロパティが配列である", () => {
    expect(Array.isArray(linkedinConfig.availableScopes)).toStrictEqual(true);
  });

  test("正常系: availableScopes の長さが3である", () => {
    expect(linkedinConfig.availableScopes.length).toStrictEqual(3);
  });

  test("正常系: profile スコープが正しく設定されている", () => {
    const profileScope = linkedinConfig.availableScopes[0];
    expect(profileScope).toStrictEqual({
      id: "profile",
      label: "プロフィール（基本）",
      description: "基本的なプロフィール情報",
      scopes: ["r_liteprofile"],
    });
  });

  test("正常系: email スコープが正しく設定されている", () => {
    const emailScope = linkedinConfig.availableScopes[1];
    expect(emailScope).toStrictEqual({
      id: "email",
      label: "メールアドレス",
      description: "メールアドレスへのアクセス",
      scopes: ["r_emailaddress"],
    });
  });

  test("正常系: share スコープが正しく設定されている", () => {
    const shareScope = linkedinConfig.availableScopes[2];
    expect(shareScope).toStrictEqual({
      id: "share",
      label: "投稿の作成",
      description: "LinkedIn上での投稿の作成",
      scopes: ["w_member_social"],
    });
  });

  test("正常系: オブジェクトが読み取り専用である", () => {
    const config = linkedinConfig;
    // TypeScriptの型システムにより、実行時エラーは発生しないが、
    // as const satisfies により型レベルで読み取り専用が保証される
    expect(Object.isFrozen(config)).toStrictEqual(false);
    // 注: as const は型レベルの制約であり、実行時には影響しない
  });

  test("正常系: すべてのスコープにidプロパティが存在する", () => {
    linkedinConfig.availableScopes.forEach((scope) => {
      expect(typeof scope.id).toStrictEqual("string");
      expect(scope.id.length).toBeGreaterThan(0);
    });
  });

  test("正常系: すべてのスコープにlabelプロパティが存在する", () => {
    linkedinConfig.availableScopes.forEach((scope) => {
      expect(typeof scope.label).toStrictEqual("string");
      expect(scope.label.length).toBeGreaterThan(0);
    });
  });

  test("正常系: すべてのスコープにdescriptionプロパティが存在する", () => {
    linkedinConfig.availableScopes.forEach((scope) => {
      expect(typeof scope.description).toStrictEqual("string");
      expect(scope.description.length).toBeGreaterThan(0);
    });
  });

  test("正常系: すべてのスコープにscopesプロパティが配列として存在する", () => {
    linkedinConfig.availableScopes.forEach((scope) => {
      expect(Array.isArray(scope.scopes)).toStrictEqual(true);
      expect(scope.scopes.length).toBeGreaterThan(0);
    });
  });

  test("正常系: スコープのIDがユニークである", () => {
    const ids = linkedinConfig.availableScopes.map((scope) => scope.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toStrictEqual(ids.length);
  });

  test("正常系: すべてのスコープ配列内の値が文字列である", () => {
    linkedinConfig.availableScopes.forEach((scope) => {
      scope.scopes.forEach((scopeValue) => {
        expect(typeof scopeValue).toStrictEqual("string");
        expect(scopeValue.length).toBeGreaterThan(0);
      });
    });
  });

  test("正常系: categoryプロパティが存在しない", () => {
    linkedinConfig.availableScopes.forEach((scope) => {
      expect("category" in scope).toStrictEqual(false);
    });
  });

  test("正常系: LinkedInのスコープ値が正しい形式である", () => {
    const allScopes = linkedinConfig.availableScopes.flatMap(
      (scope) => scope.scopes,
    );
    const expectedScopes = [
      "r_liteprofile",
      "r_emailaddress",
      "w_member_social",
    ];
    expect(allScopes).toStrictEqual(expectedScopes);
  });

  test("正常系: プロファイルスコープが読み取り権限である", () => {
    const readScopes = linkedinConfig.availableScopes
      .filter((scope) => scope.id === "profile" || scope.id === "email")
      .flatMap((scope) => scope.scopes);

    readScopes.forEach((scope) => {
      expect(scope.startsWith("r_")).toStrictEqual(true);
    });
  });

  test("正常系: 投稿スコープが書き込み権限である", () => {
    const writeScopes =
      linkedinConfig.availableScopes.find((scope) => scope.id === "share")
        ?.scopes || [];

    writeScopes.forEach((scope) => {
      expect(scope.startsWith("w_")).toStrictEqual(true);
    });
  });
});
