import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Profile = {
  id: string;
  email?: string | null;
  full_name: string;
  age: number;
  relationship_status?: string | null;
  looking_for?: string | null;
  bio?: string | null;
  whatsapp_number?: string | null;
  image_url_1?: string | null;
  image_url_2?: string | null;
  has_paid?: boolean | null;
  created_at?: string;
};

export function normalizeWhatsApp(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

export function isValidWhatsApp(value: string) {
  return /^234\d{10}$/.test(normalizeWhatsApp(value));
}

export function whatsappLink(phone: string) {
  const normalized = normalizeWhatsApp(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent("Hi! I saw your profile on Request Date")}`;
}

export async function compressImage(file: File, maxWidth = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare image upload");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not compress image")), "image/jpeg", 0.82);
  });
}
