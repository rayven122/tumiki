const resetHooks = new Set<() => void>();

export const registerJacksonResetHook = (hook: () => void): void => {
  resetHooks.add(hook);
};

export const runJacksonResetHooks = (): void => {
  for (const hook of resetHooks) {
    hook();
  }
};
