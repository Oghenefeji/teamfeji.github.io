import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

describe("payment persistence security", () => {
  it("keeps paid access and authoritative payment inserts server-owned", () => {
    expect(schema).toContain('with check (public.can_update_profile(id, has_paid));');
    expect(schema).toContain('grant execute on function public.can_update_profile(uuid, boolean) to authenticated;');
    expect(schema).not.toContain('create policy "Members record their own successful payment"');
  });

  it("includes the gateway reference field in the payment schema", () => {
    expect(schema).toContain("flw_ref text");
    expect(schema).toContain("alter table public.payments add column if not exists flw_ref text;");
  });
});
