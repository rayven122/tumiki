export type Success<T> = {
  success: true;
  data: T;
};

export type Failure<E = Error> = {
  success: false;
  error: E;
};

export type Result<T, E = Error> = Success<T> | Failure<E>;

export const ok = <T>(data: T): Success<T> => ({
  success: true,
  data,
});

export const err = <E = Error>(error: E): Failure<E> => ({
  success: false,
  error,
});

export const isOk = <T, E>(result: Result<T, E>): result is Success<T> =>
  result.success === true;

export const isErr = <T, E>(result: Result<T, E>): result is Failure<E> =>
  result.success === false;

export const mapResult = <T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U,
): Result<U, E> => {
  if (isOk(result)) {
    return ok(fn(result.data));
  }
  return result;
};
