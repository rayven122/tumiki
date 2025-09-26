export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
});

export const err = <E>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

export const isOk = <T, E>(
  result: Result<T, E>,
): result is { ok: true; value: T } => result.ok;

export const isErr = <T, E>(
  result: Result<T, E>,
): result is { ok: false; error: E } => !result.ok;

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
};

export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> => {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
};

export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> => {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
};
