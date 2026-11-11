/**
 * Shape of untrusted third-party JSON (Evolution API webhooks, OpenRouter responses,
 * JSON columns). It is read defensively with optional chaining and validated before
 * use, so it is deliberately loose. Named once here instead of repeating `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Loose = Record<string, any>
