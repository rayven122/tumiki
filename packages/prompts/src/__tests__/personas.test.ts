import { afterEach, describe, expect, test } from "vitest";

import { clearCache } from "../loader.js";
import { listPersonas, loadPersona } from "../personas.js";

afterEach(() => {
  clearCache();
});

describe("listPersonas", () => {
  test("利用可能なペルソナ一覧を返す", () => {
    const personas = listPersonas();
    expect(personas.length).toBeGreaterThanOrEqual(2);

    const ids = personas.map((p) => p.id);
    expect(ids).toContain("default");
    expect(ids).toContain("coharu");
  });

  test("各ペルソナに必須メタデータが含まれる", () => {
    const personas = listPersonas();
    for (const persona of personas) {
      expect(persona.id).toBeTruthy();
      expect(persona.name).toBeTruthy();
      expect(persona.description).toBeTruthy();
    }
  });
});

describe("loadPersona", () => {
  test("デフォルトペルソナを読み込む", () => {
    const persona = loadPersona();
    expect(persona.metadata.id).toBe("default");
    expect(persona.content).toContain("friendly assistant");
  });

  test("指定IDのペルソナを読み込む", () => {
    const persona = loadPersona("coharu");
    expect(persona.metadata.id).toBe("coharu");
    expect(persona.content).toContain("Coharu");
  });

  test("存在しないIDの場合はデフォルトにフォールバック", () => {
    const persona = loadPersona("nonexistent");
    expect(persona.metadata.id).toBe("default");
  });

  test("undefined を渡した場合はデフォルトを返す", () => {
    const persona = loadPersona(undefined);
    expect(persona.metadata.id).toBe("default");
  });
});
