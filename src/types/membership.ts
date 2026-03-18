export type MembershipStatus =
  | 'registered'
  | 'applicant'
  | 'observer'
  | 'associate'
  | 'active'
  | 'restricted'
  | 'expelled'

export type UserRole = 'farmer' | 'mpk' | 'services' | 'feed_producer' | 'admin' | 'expert'

const STATUS_ORDER: MembershipStatus[] = [
  'registered',
  'applicant',
  'observer',
  'associate',
  'active',
  'restricted',
  'expelled',
]

export function hasMinStatus(
  current: MembershipStatus,
  required: MembershipStatus
): boolean {
  return STATUS_ORDER.indexOf(current) >= STATUS_ORDER.indexOf(required)
}
