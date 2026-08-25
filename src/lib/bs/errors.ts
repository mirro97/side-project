export type BsErrorKind =
  | 'BadRequest' | 'Forbidden' | 'NotFound'
  | 'RateLimited' | 'Maintenance' | 'Unknown'

export class BsError extends Error {
  constructor(
    public readonly kind: BsErrorKind,
    public readonly status: number,
  ) {
    super(`${kind} (${status})`)
    this.name = 'BsError'
  }
}

export function kindFromStatus(status: number): BsErrorKind {
  switch (status) {
    case 400: return 'BadRequest'
    case 403: return 'Forbidden'
    case 404: return 'NotFound'
    case 429: return 'RateLimited'
    case 503: return 'Maintenance'
    default: return 'Unknown'
  }
}
