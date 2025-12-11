// though for much more complex webapps I'd use https://github.com/supermacro/neverthrow

export type Result<T, E> = Success<T> | Failure<E>

// types

export type Success<T> = {
  success: true
  data: T
}

export type Failure<E> = {
  success: false
  error: E
}

// result wrappers

export function success<T>(data: T): Success<T> {
  return {
    success: true,
    data,
  }
}

export function failure<E>(error: E): Failure<E> {
  return {
    success: false,
    error,
  }
}

// result type guards

export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false
}

// utility types to extract failure or success types from Result

// Since Result<T, E> = Success<T> | Failure<E>, we extract T from the Success branch
// The conditional type distributes over the union, extracting T from Success<T>
export type ExtractSuccess<R> = R extends Success<infer T> ? T : never

// Since Result<T, E> = Success<T> | Failure<E>, we extract E from the Failure branch
// The conditional type distributes over the union, extracting E from Failure<E>
export type ExtractFailure<R> = R extends Failure<infer E> ? E : never
