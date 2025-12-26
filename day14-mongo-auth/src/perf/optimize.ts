// Hot-path optimizations for auth service.
// Focus: keep allocations down and avoid redundant DB hits.

export const normalizeEmail = (email: unknown): string => {
  if (typeof email !== 'string') return '';
  const t = email.trim().toLowerCase();
  return t;
};
