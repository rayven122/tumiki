export const isAddressInUseError = (error: unknown): boolean =>
  error instanceof Error &&
  (error as NodeJS.ErrnoException).code === "EADDRINUSE";
