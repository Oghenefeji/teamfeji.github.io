import { isExistingUserError, profileUpsertOptions } from "./request-date-auth";

type AuthResult = { data: { session: unknown | null }; error: { message: string } | null };
type AuthApi = {
  signUp: (credentials: { email: string; password: string }) => Promise<AuthResult>;
  signInWithPassword: (credentials: { email: string; password: string }) => Promise<AuthResult>;
};

type ProfileClient = {
  from: (table: "profiles") => {
    upsert: (values: Record<string, unknown>, options: typeof profileUpsertOptions) => any;
  };
};

export async function signUpOrSignIn(auth: AuthApi, email: string, password: string, mode: "signup" | "login") {
  let result = mode === "signup"
    ? await auth.signUp({ email, password })
    : await auth.signInWithPassword({ email, password });
  if (mode === "signup" && result.error && isExistingUserError(result.error.message)) {
    result = await auth.signInWithPassword({ email, password });
  }
  return result;
}

export function upsertProfileRecord(client: ProfileClient, profile: Record<string, unknown>) {
  return client.from("profiles").upsert(profile, profileUpsertOptions);
}
