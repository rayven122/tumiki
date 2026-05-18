export type ToolSearchTextSource = {
  name: string;
  description: string;
  customName: string | null;
  customDescription: string | null;
};

export const normalizeSearchWhitespace = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

export const simplifyToolSearchText = (tool: ToolSearchTextSource): string => {
  const name = normalizeSearchWhitespace(tool.customName ?? tool.name);
  const description = normalizeSearchWhitespace(
    tool.customDescription ?? tool.description,
  );

  return [name, description].filter((part) => part.length > 0).join("\n");
};
