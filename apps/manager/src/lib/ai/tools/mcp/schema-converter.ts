import { z } from "zod";

/**
 * JSON Schema型定義
 */
type JsonSchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "array"
  | "object"
  | "null";

type JsonSchema = {
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: (string | number | boolean)[];
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
};

/**
 * JSON SchemaをZodスキーマに変換
 *
 * MCPツールのinputSchemaをVercel AI SDKで使用可能な形式に変換
 * サポート: string, number, integer, boolean, array, object, enum, nullable
 */
export const convertJsonSchemaToZod = (
  jsonSchema: JsonSchema,
): z.ZodTypeAny => {
  // enumの処理
  if (jsonSchema.enum && jsonSchema.enum.length > 0) {
    const enumValues = jsonSchema.enum as [string, ...string[]];
    return z.enum(enumValues.map(String) as [string, ...string[]]);
  }

  // typeが配列の場合（nullable対応）
  if (Array.isArray(jsonSchema.type)) {
    const types = jsonSchema.type.filter((t) => t !== "null");
    const isNullable = jsonSchema.type.includes("null");

    if (types.length === 1) {
      const baseSchema = convertJsonSchemaToZod({
        ...jsonSchema,
        type: types[0],
      });
      return isNullable ? baseSchema.nullable() : baseSchema;
    }
    // 複数のtype（nullを除く）がある場合はunknownにフォールバック
    return z.unknown();
  }

  const type = jsonSchema.type as JsonSchemaType | undefined;

  switch (type) {
    case "string": {
      let schema = z.string();
      if (jsonSchema.description) {
        schema = schema.describe(jsonSchema.description);
      }
      if (jsonSchema.minLength !== undefined) {
        schema = schema.min(jsonSchema.minLength);
      }
      if (jsonSchema.maxLength !== undefined) {
        schema = schema.max(jsonSchema.maxLength);
      }
      if (jsonSchema.pattern) {
        schema = schema.regex(new RegExp(jsonSchema.pattern));
      }
      return schema;
    }

    case "number":
    case "integer": {
      let schema = z.number();
      if (jsonSchema.description) {
        schema = schema.describe(jsonSchema.description);
      }
      if (jsonSchema.minimum !== undefined) {
        schema = schema.min(jsonSchema.minimum);
      }
      if (jsonSchema.maximum !== undefined) {
        schema = schema.max(jsonSchema.maximum);
      }
      if (type === "integer") {
        schema = schema.int();
      }
      return schema;
    }

    case "boolean": {
      let schema = z.boolean();
      if (jsonSchema.description) {
        schema = schema.describe(jsonSchema.description);
      }
      return schema;
    }

    case "array": {
      const itemSchema = jsonSchema.items
        ? convertJsonSchemaToZod(jsonSchema.items)
        : z.unknown();
      let schema = z.array(itemSchema);
      if (jsonSchema.description) {
        schema = schema.describe(jsonSchema.description);
      }
      return schema;
    }

    case "object": {
      const properties = jsonSchema.properties;
      if (!properties) {
        // additionalPropertiesがある場合はRecord型
        if (jsonSchema.additionalProperties) {
          const valueSchema =
            typeof jsonSchema.additionalProperties === "object"
              ? convertJsonSchemaToZod(jsonSchema.additionalProperties)
              : z.unknown();
          return z.record(z.string(), valueSchema);
        }
        return z.object({});
      }

      const required = jsonSchema.required ?? [];
      const shape: Record<string, z.ZodTypeAny> = {};

      for (const [key, value] of Object.entries(properties)) {
        const fieldSchema = convertJsonSchemaToZod(value);
        shape[key] = required.includes(key)
          ? fieldSchema
          : fieldSchema.optional();
      }

      let schema = z.object(shape);
      if (jsonSchema.description) {
        schema = schema.describe(jsonSchema.description);
      }
      return schema;
    }

    case "null":
      return z.null();

    default:
      // oneOf/anyOf/allOfの処理
      if (jsonSchema.oneOf && jsonSchema.oneOf.length > 0) {
        const schemas = jsonSchema.oneOf.map(convertJsonSchemaToZod);
        const first = schemas[0];
        const second = schemas[1];
        if (schemas.length === 1 && first) return first;
        if (first && second) {
          return z.union([first, second, ...schemas.slice(2)]);
        }
        return z.unknown();
      }
      if (jsonSchema.anyOf && jsonSchema.anyOf.length > 0) {
        const schemas = jsonSchema.anyOf.map(convertJsonSchemaToZod);
        const first = schemas[0];
        const second = schemas[1];
        if (schemas.length === 1 && first) return first;
        if (first && second) {
          return z.union([first, second, ...schemas.slice(2)]);
        }
        return z.unknown();
      }

      // typeが未指定の場合はunknown
      return z.unknown();
  }
};
