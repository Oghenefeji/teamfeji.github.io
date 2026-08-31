type AccountClient = {
  from: (table: "profiles") => any;
};

export function updateProfileRecord(client: AccountClient, userId: string, profile: Record<string, unknown>) {
  return client.from("profiles").update(profile).eq("id", userId);
}

export function deleteProfileRecord(client: AccountClient, userId: string) {
  return client.from("profiles").delete().eq("id", userId);
}
