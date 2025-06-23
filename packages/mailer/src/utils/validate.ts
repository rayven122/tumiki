export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateEmails(emails: string[]): boolean {
  return emails.every(validateEmail);
}

export function normalizeEmailList(
  emails: string | string[] | undefined,
): string[] | undefined {
  if (!emails) return undefined;
  if (typeof emails === "string") return [emails];
  return emails;
}
