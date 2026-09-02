import type { Profile } from "./supabase";

type FeedClient = {
  from: (table: "public_profiles") => any;
  rpc: (name: "get_paid_profiles") => any;
};

export async function fetchLiveProfiles(client: FeedClient, paidAccess = false) {
  if (paidAccess) {
    const { data, error } = await client.rpc("get_paid_profiles");
    if (error) throw error;
    return (data as Profile[]) || [];
  }

  const { data, error } = await client.from("public_profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Profile[]) || [];
}
