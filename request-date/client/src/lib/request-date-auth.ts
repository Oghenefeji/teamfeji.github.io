export function isExistingUserError(message: string | null | undefined) {
  return Boolean(message && /user already registered|already registered|user already exists/i.test(message));
}

export const profileUpsertOptions = { onConflict: "id" } as const;
