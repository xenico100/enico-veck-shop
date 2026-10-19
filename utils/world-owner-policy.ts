/**
 * Pure policy for an identity already verified by the server with auth.getUser().
 * Deliberately does not accept email, roles, app_metadata or user_metadata.
 */
export type WorldOwnerIdentity = {
  id?: unknown;
  is_anonymous?: unknown;
};

export type WorldOwnerDecision =
  | { allowed: true }
  | { allowed: false; reason: 'unavailable' | 'unauthenticated' | 'forbidden' };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseWorldOwnerUserId(value: unknown): string | null {
  if (typeof value !== 'string' || !uuidPattern.test(value.trim())) return null;
  return value.trim().toLowerCase();
}

export function decideWorldOwnerAccess(
  verifiedUser: WorldOwnerIdentity | null | undefined,
  configuredOwnerId: unknown
): WorldOwnerDecision {
  const ownerId = parseWorldOwnerUserId(configuredOwnerId);
  if (!ownerId) return { allowed: false, reason: 'unavailable' };

  const userId = parseWorldOwnerUserId(verifiedUser?.id);
  // Missing anonymity information is not proof of a non-anonymous account.
  if (!userId || verifiedUser?.is_anonymous !== false) {
    return { allowed: false, reason: 'unauthenticated' };
  }

  if (userId !== ownerId) return { allowed: false, reason: 'forbidden' };
  return { allowed: true };
}
