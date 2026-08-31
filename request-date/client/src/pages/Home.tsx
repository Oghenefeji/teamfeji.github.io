import { useEffect, useMemo, useRef, useState } from "react";
import { supabase, type Profile, compressImage, isValidWhatsApp, normalizeWhatsApp, whatsappLink } from "@/lib/supabase";
import { signUpOrSignIn, upsertProfileRecord } from "@/lib/auth-flow";
import { profileImages } from "@/lib/profile-view";
import { fetchLiveProfiles } from "@/lib/profile-feed";
import { updateProfileRecord, deleteProfileRecord } from "@/lib/account-actions";
import { isSuccessfulFlutterwaveResponse } from "@/lib/payment-flow";
import { PAYMENT_SUCCESS_MESSAGE, canCelebrateAfterCheckoutClose } from "@/lib/payment-success";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Heart, ImagePlus, LockKeyhole, MessageCircle, PartyPopper, Sparkles, UserRound, Settings2, ShieldCheck, Trash2 } from "lucide-react";

type AuthMode = "signup" | "login";
type ProfileForm = { email: string; password: string; full_name: string; age: string; relationship_status: string; looking_for: string; bio: string; whatsapp_number: string };

const emptyForm: ProfileForm = { email: "", password: "", full_name: "", age: "", relationship_status: "Single", looking_for: "", bio: "", whatsapp_number: "" };
const SUPPORT_EMAIL = "teamfeji4@gmail.com";

export default function Home() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [session, setSession] = useState<any>(null);
  const [accountProfile, setAccountProfile] = useState<Profile | null>(null);
  const [paid, setPaid] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentHelpOpen, setPaymentHelpOpen] = useState(false);
  const [pendingPaymentProfile, setPendingPaymentProfile] = useState<Profile | null>(null);
  const [paymentCelebration, setPaymentCelebration] = useState(false);
  const paymentVerifiedRef = useRef(false);
  const checkoutClosedRef = useRef(false);
  const paymentCelebratedRef = useRef(false);
  const paymentStatusRef = useRef<string | undefined>(undefined);
  const celebrationTimerRef = useRef<number | null>(null);
  const [activeImages, setActiveImages] = useState<Record<string, number>>({});
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);

  async function loadProfiles(paidAccess = paid) {
    if (!supabase) { setProfiles([]); setFeedLoading(false); return; }
    setFeedLoading(true);
    setFeedError("");
    try {
      const data = await fetchLiveProfiles(supabase, paidAccess);
      setProfiles(data);
    } catch (error: any) {
      setProfiles([]);
      setFeedError(error?.message || "Live profiles could not be loaded. Please try again.");
    } finally { setFeedLoading(false); }
  }

  async function loadPaidAccess(userId: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from("profiles").select("has_paid").eq("id", userId).single();
    if (error) {
      if (error.code !== "PGRST116") toast.error(error.message);
      setPaid(false);
      return;
    }
    setPaid(data?.has_paid === true);
    setAccountProfile((current) => current ? { ...current, has_paid: data?.has_paid === true } : current);
  }

  async function loadOwnProfile(userId: string, openOnboarding = true) {
    if (!supabase) return;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) { toast.error(error.message); return; }
    if (!data) { setAccountProfile(null); setPaid(false); if (openOnboarding) setOnboardingOpen(true); return; }
    const profile = data as Profile;
    setAccountProfile(profile);
    setPaid(Boolean(profile.has_paid));
    setForm((current) => ({ ...current, email: profile.email || current.email, full_name: profile.full_name || "", age: profile.age ? String(profile.age) : "", relationship_status: profile.relationship_status || "Single", looking_for: profile.looking_for || "", bio: profile.bio || "", whatsapp_number: profile.whatsapp_number || "" }));
  }

  useEffect(() => {
    if (!supabase) { setFeedLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setPaid(false);
        setAccountProfile(null);
        void loadProfiles(false);
        return;
      }
      void loadPaidAccess(nextSession.user.id);
      void loadOwnProfile(nextSession.user.id);
    });
    loadProfiles(false);
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    void (async () => {
      await loadPaidAccess(session.user.id);
      await loadOwnProfile(session.user.id);
      await loadProfiles(paid);
    })();
  }, [session?.user?.id]);

  useEffect(() => { if (session?.user?.id) loadProfiles(paid); }, [paid]);

  const displayProfiles = useMemo(() => profiles, [profiles]);
  const updateForm = (key: keyof ProfileForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const requireAuth = (profile?: Profile) => { setActiveProfile(profile || null); setAuthMode("signup"); setAuthOpen(true); };

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault();
    if (authBusy || !supabase) { if (!supabase) toast.error("Supabase is not configured yet."); return; }
    setAuthBusy(true);
    try {
      const result = await signUpOrSignIn(supabase.auth, form.email, form.password, authMode);
      if (result.error) { toast.error(result.error.message); return; }
      const nextSession = (result.data.session || (await supabase.auth.getSession()).data.session) as any;
      setSession(nextSession);
      setAuthOpen(false);
      if (nextSession) { await loadOwnProfile(nextSession.user.id); await loadProfiles(false); }
      else if (authMode === "signup") toast.success("Account created. Finish setup after confirming your email.");
      else toast.success("Welcome back to Request Date.");
    } catch (error: any) { toast.error(error?.message || "Authentication failed."); }
    finally { setAuthBusy(false); }
  }

  async function uploadProfiles(userId: string, selectedFiles: File[]) {
    if (!supabase || selectedFiles.length === 0) return [] as string[];
    const urls: string[] = [];
    for (const file of selectedFiles.slice(0, 2)) {
      const compressed = await compressImage(file);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from("profile-images").upload(path, compressed, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      urls.push(supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (authBusy) return;
    if (!supabase || !session?.user) { toast.error("Please sign in to create a profile."); return; }
    if (!form.whatsapp_number.trim() || !isValidWhatsApp(form.whatsapp_number)) { toast.error("Enter a valid Nigerian WhatsApp number, for example 0801 234 5678."); return; }
    if (files.length > 2) { toast.error("Please choose no more than two photos."); return; }
    setAuthBusy(true);
    try {
      const uploaded = await uploadProfiles(session.user.id, files);
      const profileData = { email: session.user.email, full_name: form.full_name.trim(), age: Number(form.age), relationship_status: form.relationship_status, looking_for: form.looking_for.trim(), bio: form.bio.trim(), whatsapp_number: normalizeWhatsApp(form.whatsapp_number), image_url_1: uploaded[0] || accountProfile?.image_url_1 || null, image_url_2: uploaded[1] || accountProfile?.image_url_2 || null };
      const result = accountProfile
        ? await updateProfileRecord(supabase, session.user.id, profileData)
        : await upsertProfileRecord(supabase, { id: session.user.id, ...profileData, has_paid: false });
      if (result.error) throw result.error;
      const nextProfile = { id: session.user.id, ...profileData, has_paid: accountProfile?.has_paid || false } as Profile;
      setAccountProfile(nextProfile);
      setOnboardingOpen(false); setAccountOpen(false); setFiles([]);
      toast.success(accountProfile ? "Profile updated successfully. Your changes are now live." : "Your profile is live.");
      await loadProfiles(paid);
    } catch (error: any) { toast.error(error?.message || "Could not save your profile."); }
    finally { setAuthBusy(false); }
  }

  async function deleteAccount() {
    if (!supabase || !session?.user) return;
    setAuthBusy(true);
    try {
      const { error } = await deleteProfileRecord(supabase, session.user.id);
      if (error) throw error;
      await supabase.auth.signOut();
      setSession(null); setAccountProfile(null); setPaid(false); setProfiles([]); setDeleteOpen(false); setAccountOpen(false);
      await loadProfiles(false);
      toast.success("Your profile has been removed.");
    } catch (error: any) { toast.error(error?.message || "Could not delete your profile."); }
    finally { setAuthBusy(false); }
  }

  function openAccount() {
    if (!session) return requireAuth();
    setFiles([]); setAccountOpen(true);
  }

  function beginPayment(profile: Profile) {
    if (!session) { requireAuth(profile); return; }
    if (paid || accountProfile?.has_paid) {
      if (profile.whatsapp_number) window.open(whatsappLink(profile.whatsapp_number), "_blank", "noopener,noreferrer");
      else toast.error("This profile has not added a WhatsApp number yet.");
      return;
    }
    setPendingPaymentProfile(profile);
    setPaymentHelpOpen(true);
  }

  function celebratePayment() {
    if (!canCelebrateAfterCheckoutClose({ status: paymentStatusRef.current, verified: paymentVerifiedRef.current, checkoutClosed: checkoutClosedRef.current, alreadyCelebrated: paymentCelebratedRef.current })) return;
    paymentCelebratedRef.current = true;
    setPaymentCelebration(true);
    toast.success(PAYMENT_SUCCESS_MESSAGE, { duration: 5000 });
    if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = window.setTimeout(() => setPaymentCelebration(false), 5200);
  }

  function launchPayment(profile: Profile) {
    if (!session || !supabase) return;
    const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;
    if (!publicKey || !(window as any).FlutterwaveCheckout) { toast.error("Flutterwave checkout is not configured yet."); return; }
    setPaymentHelpOpen(false);
    setPendingPaymentProfile(null);
    paymentVerifiedRef.current = false;
    checkoutClosedRef.current = false;
    paymentCelebratedRef.current = false;
    paymentStatusRef.current = undefined;
    setPaymentBusy(true);
    (window as any).FlutterwaveCheckout({ public_key: publicKey, tx_ref: `RD-${Date.now()}`, amount: 1500, currency: "NGN", payment_options: "card, ussd, banktransfer", customer: { email: session.user.email, name: session.user.user_metadata?.full_name || "Request Date member" }, customizations: { title: "Request Date Premium", description: "Unlimited WhatsApp access for life" }, callback: async (data: any) => {
      if (!isSuccessfulFlutterwaveResponse(data) || !supabase) { setPaymentBusy(false); return; }
      try {
        const verification = await fetch("/api/payments/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transaction_id: data.transaction_id, access_token: session.access_token }) });
        const result = await verification.json();
        if (!verification.ok || !result.success) throw new Error(result.error || "Payment verification failed.");
        paymentStatusRef.current = data.status;
        paymentVerifiedRef.current = true;
        setPaid(true);
        setAccountProfile((current) => current ? { ...current, has_paid: true } : current);
        await loadProfiles(true);
      } catch (error: any) { toast.error(error?.message || "Payment verification failed."); paymentVerifiedRef.current = false; }
      finally { setPaymentBusy(false); celebratePayment(); }
    }, onclose: () => { checkoutClosedRef.current = true; setPaymentBusy(false); celebratePayment(); } });
  }

  return <div className="min-h-screen bg-white text-[#0f172a]">
    <div className="border-b border-[#dcfce7] bg-[#0f172a] px-4 py-2 text-center text-xs font-semibold tracking-wide text-white/85">A more thoughtful way to meet someone new.</div>
    <header className="sticky top-0 z-30 border-b border-[#dcfce7] bg-white/95 backdrop-blur-xl"><div className="container flex h-20 items-center justify-between gap-4"><a href="#top" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#4ade80] text-[#0f172a] shadow-[0_8px_24px_rgba(34,197,94,.18)]"><Heart className="size-5 fill-current" /></span><span className="text-lg font-black tracking-[-.04em]">request date<span className="text-[#16a34a]">.</span></span></a><div className="flex items-center gap-2"><a href={`mailto:${SUPPORT_EMAIL}`} className="hidden text-sm font-semibold text-[#15803d] transition hover:text-[#166534] sm:inline">Contact Support</a><span className="hidden text-sm text-[#0f172a]/60 sm:inline">{session ? (paid ? "Premium member" : "Free member") : "Browse freely"}</span>{session ? <><Button variant="outline" className="rounded-full border-[#bbf7d0] text-[#0f172a] hover:bg-[#f0fdf4]" onClick={openAccount}><Settings2 className="mr-1 size-4" /> My Account</Button><Button className="rounded-full bg-[#0f172a] px-5 text-white hover:bg-[#1e293b]" onClick={() => supabase?.auth.signOut()}>Sign out</Button></> : <Button className="rounded-full bg-[#0f172a] px-5 text-white hover:bg-[#1e293b]" onClick={() => { setAuthMode("signup"); setAuthOpen(true); }}>Join free <ArrowUpRight className="ml-1 size-4" /></Button>}</div></div></header>
    <main id="top"><section className="container grid gap-10 border-b border-[#dcfce7] pb-16 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-24"><div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2 text-xs font-bold uppercase tracking-[.15em] text-[#15803d]"><Sparkles className="size-3.5" /> Real people. Real intentions.</div><h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.07em] sm:text-7xl">Meet someone worth <span className="relative inline-block"><span className="relative z-10">writing to.</span><span className="absolute bottom-1 left-0 -z-0 h-3 w-full -rotate-2 rounded-full bg-[#86efac] sm:h-5" /></span></h1><p className="mt-7 max-w-xl text-lg leading-8 text-[#0f172a]/65">Browse live profiles, find a spark, and make the first move. Request Date keeps it simple, warm, and human.</p><div className="mt-8 flex flex-wrap items-center gap-3"><Button onClick={() => document.getElementById("profiles")?.scrollIntoView({ behavior: "smooth" })} className="h-12 rounded-full bg-[#22c55e] px-6 font-bold text-[#052e16] hover:bg-[#4ade80]">Explore profiles <ChevronRight className="ml-1 size-4" /></Button><span className="text-sm text-[#0f172a]/55">Free to browse · ₦1,500 lifetime access</span></div></div><div className="relative min-h-[300px] overflow-hidden rounded-[2rem] border border-[#bbf7d0] bg-[#f0fdf4] p-8 lg:min-h-[360px]"><div className="absolute -right-12 -top-14 size-64 rounded-full bg-[#86efac]/60 blur-2xl" /><div className="absolute bottom-8 left-8 right-8"><p className="text-sm font-bold uppercase tracking-[.18em] text-[#15803d]">A better way to meet</p><p className="mt-3 max-w-sm text-3xl font-black tracking-[-.05em] text-[#0f172a]">Start with a profile, not a performance.</p><p className="mt-4 max-w-sm text-sm leading-6 text-[#0f172a]/60">Real people. Clear intentions. One thoughtful first message.</p></div></div></section><section id="profiles" className="container pb-24 pt-12"><div className="mb-8 flex items-end justify-between gap-5"><div><p className="text-sm font-bold uppercase tracking-[.18em] text-[#16a34a]">The community</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-4xl">People you might like</h2></div><p className="hidden max-w-xs text-right text-sm leading-6 text-[#0f172a]/55 sm:block">Live profiles, shared by members who are ready to be found.</p></div>{feedError && <div className="mb-6 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">{feedError}</div>}{feedLoading ? <div aria-busy="true" aria-label="Loading live profiles" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((index) => <ProfileFeedSkeleton key={index} index={index} />)}</div> : displayProfiles.length === 0 ? <div className="rounded-[1.5rem] border border-dashed border-[#86efac] bg-[#f0fdf4] px-6 py-16 text-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#bbf7d0] text-[#166534]"><UserRound className="size-6" /></div><h3 className="mt-5 text-xl font-black">No live profiles found yet.</h3><p className="mt-2 text-sm text-[#0f172a]/60">Be the first to join!</p><Button onClick={() => { setAuthMode("signup"); setAuthOpen(true); }} className="mt-5 rounded-full bg-[#22c55e] font-bold text-[#052e16] hover:bg-[#4ade80]">Create your profile</Button></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{displayProfiles.map((profile) => <ProfileCard key={profile.id} profile={profile} index={activeImages[profile.id] || 0} onToggle={(direction) => setActiveImages((current) => ({ ...current, [profile.id]: direction }))} locked={!paid} onConnect={() => beginPayment(profile)} />)}</div>}</section></main>
    <section className="border-y border-[#dcfce7] bg-[#f0fdf4]"><div className="container grid gap-8 py-14 sm:grid-cols-3"><div><p className="text-4xl font-black tracking-[-.06em] text-[#16a34a]">01</p><h3 className="mt-3 font-bold">Browse with intention</h3><p className="mt-2 text-sm leading-6 text-[#0f172a]/60">See the person behind the profile before you decide to connect.</p></div><div><p className="text-4xl font-black tracking-[-.06em] text-[#16a34a]">02</p><h3 className="mt-3 font-bold">Create your profile</h3><p className="mt-2 text-sm leading-6 text-[#0f172a]/60">Share a little about yourself and show up in the community.</p></div><div><p className="text-4xl font-black tracking-[-.06em] text-[#16a34a]">03</p><h3 className="mt-3 font-bold">Make the first move</h3><p className="mt-2 text-sm leading-6 text-[#0f172a]/60">Unlock lifetime contact access and start a real conversation.</p></div></div></section><section id="support" className="border-y border-[#dcfce7] bg-white"><div className="container py-5 text-center text-sm text-[#0f172a]/65">Need help or payment issues? Contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-[#15803d] underline decoration-[#86efac] underline-offset-4 hover:text-[#166534]">{SUPPORT_EMAIL}</a></div></section><footer className="container flex flex-col gap-3 py-8 text-sm text-[#0f172a]/55 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 request date.</span><span>Made for genuine connections.</span></footer>

    <Dialog open={authOpen} onOpenChange={setAuthOpen}><DialogContent className="rounded-[1.5rem] border-[#dcfce7] p-0 sm:max-w-md"><div className="p-7"><DialogHeader><div className="mb-5 grid size-11 place-items-center rounded-2xl bg-[#bbf7d0]"><UserRound className="size-5 text-[#166534]" /></div><DialogTitle className="text-2xl font-black tracking-[-.04em]">{authMode === "signup" ? "Create your free profile" : "Welcome back"}</DialogTitle><DialogDescription>{activeProfile ? "Sign up first, then unlock WhatsApp access when you are ready." : "Join a community built around making a genuine first move."}</DialogDescription></DialogHeader><form onSubmit={handleAuth} className="mt-6 space-y-4"><Input required type="email" placeholder="Email address" value={form.email} onChange={(e) => updateForm("email", e.target.value)} className="h-12 rounded-xl" /><Input required minLength={6} type="password" placeholder="Password (6+ characters)" value={form.password} onChange={(e) => updateForm("password", e.target.value)} className="h-12 rounded-xl" /><Button disabled={authBusy} type="submit" className="h-12 w-full rounded-xl bg-[#22c55e] font-bold text-[#052e16] hover:bg-[#4ade80]">{authBusy ? "Please wait…" : authMode === "signup" ? "Continue to profile setup" : "Sign in"}</Button></form><button className="mt-5 w-full text-center text-sm font-semibold text-[#15803d]" onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>{authMode === "signup" ? "Already a member? Sign in" : "New here? Create an account"}</button></div></DialogContent></Dialog>

    <Dialog open={paymentHelpOpen} onOpenChange={(open) => { setPaymentHelpOpen(open); if (!open) setPendingPaymentProfile(null); }}><DialogContent className="rounded-[1.5rem] border-[#dcfce7] p-0 sm:max-w-md"><div className="p-7"><DialogHeader><div className="mb-5 grid size-11 place-items-center rounded-2xl bg-[#bbf7d0]"><ShieldCheck className="size-5 text-[#166534]" /></div><DialogTitle className="text-2xl font-black tracking-[-.04em]">Unlock lifetime access</DialogTitle><DialogDescription>Pay ₦1,500 once to view WhatsApp numbers and start conversations with every live profile.</DialogDescription></DialogHeader><div className="mt-6 rounded-2xl border border-[#dcfce7] bg-[#f0fdf4] p-4 text-sm leading-6 text-[#166534]"><p className="font-semibold">Secure payment via Flutterwave</p><p className="mt-1 text-[#166534]/75">Your access is verified and saved to your account after payment.</p></div><Button disabled={!pendingPaymentProfile || paymentBusy} onClick={() => pendingPaymentProfile && launchPayment(pendingPaymentProfile)} className="mt-5 h-12 w-full rounded-xl bg-[#22c55e] font-bold text-[#052e16] hover:bg-[#4ade80]">Continue to secure checkout</Button><a href={`mailto:${SUPPORT_EMAIL}`} className="mt-5 block text-center text-sm font-semibold text-[#15803d] underline decoration-[#86efac] underline-offset-4 hover:text-[#166534]">Having payment trouble? Email support: {SUPPORT_EMAIL}</a></div></DialogContent></Dialog>

    <Dialog open={onboardingOpen || accountOpen} onOpenChange={(open) => { if (onboardingOpen) setOnboardingOpen(open); else setAccountOpen(open); }}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-[1.5rem] border-[#dcfce7] p-0 sm:max-w-2xl"><div className="p-7"><DialogHeader><DialogTitle className="text-2xl font-black tracking-[-.04em]">{accountOpen ? "My account" : "Tell people a little about you"}</DialogTitle><DialogDescription>{accountOpen ? "Keep your profile current so the right people can find you." : "Your profile will appear on the live feed as soon as you save it."}</DialogDescription></DialogHeader><form onSubmit={saveProfile} className="mt-6 grid gap-4 sm:grid-cols-2"><Input required placeholder="Full name" value={form.full_name} onChange={(e) => updateForm("full_name", e.target.value)} className="h-12 rounded-xl" /><Input required type="number" min={18} max={100} placeholder="Age" value={form.age} onChange={(e) => updateForm("age", e.target.value)} className="h-12 rounded-xl" /><select required value={form.relationship_status} onChange={(e) => updateForm("relationship_status", e.target.value)} className="h-12 rounded-xl border border-[#bbf7d0] bg-white px-3 text-sm"><option>Single</option><option>In a relationship</option><option>It's complicated</option></select><Input required placeholder="WhatsApp number (e.g. 0801 234 5678)" value={form.whatsapp_number} onChange={(e) => updateForm("whatsapp_number", e.target.value)} className="h-12 rounded-xl" /><Input placeholder="What are you looking for?" value={form.looking_for} onChange={(e) => updateForm("looking_for", e.target.value)} className="h-12 rounded-xl sm:col-span-2" /><Textarea placeholder="A short bio" value={form.bio} onChange={(e) => updateForm("bio", e.target.value)} className="min-h-28 rounded-xl sm:col-span-2" /><label className="flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#86efac] bg-[#f0fdf4] p-4 sm:col-span-2"><ImagePlus className="size-5 text-[#16a34a]" /><span><strong className="block text-sm">Replace with up to 2 photos</strong><small className="text-[#0f172a]/55">Images are compressed before upload.</small></span><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 2))} /></label>{files.length > 0 && <p className="text-sm text-[#0f172a]/60 sm:col-span-2">{files.length} photo{files.length > 1 ? "s" : ""} selected.</p>}<Button disabled={authBusy} type="submit" className="h-12 rounded-xl bg-[#22c55e] font-bold text-[#052e16] hover:bg-[#4ade80] sm:col-span-2">{authBusy ? "Saving profile…" : accountOpen ? "Save changes" : "Publish my profile"}</Button></form>{accountOpen && <Button variant="outline" disabled={authBusy} onClick={() => setDeleteOpen(true)} className="mt-4 h-11 w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="mr-2 size-4" /> Delete account profile</Button>}</div></DialogContent></Dialog>

    <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="rounded-[1.5rem] border-red-100"><AlertDialogHeader><AlertDialogTitle>Delete your profile?</AlertDialogTitle><AlertDialogDescription>This removes your public profile immediately and signs you out. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Keep my profile</AlertDialogCancel><AlertDialogAction disabled={authBusy} onClick={(event) => { event.preventDefault(); void deleteAccount(); }} className="rounded-xl bg-red-600 text-white hover:bg-red-700">{authBusy ? "Deleting…" : "Delete profile"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {paymentCelebration && <div role="status" aria-live="assertive" className="payment-celebration fixed inset-0 z-[70] grid place-items-center bg-[#0f172a]/35 px-5 backdrop-blur-sm"><div className="payment-celebration-card relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-[#bbf7d0] bg-white p-8 text-center shadow-2xl"><span className="celebration-spark celebration-spark-one" /><span className="celebration-spark celebration-spark-two" /><span className="celebration-spark celebration-spark-three" /><div className="payment-success-icon mx-auto grid size-20 place-items-center rounded-[1.75rem] bg-[#4ade80] text-[#052e16] shadow-[0_15px_40px_rgba(34,197,94,.28)]"><PartyPopper className="size-9" /></div><p className="mt-6 text-xs font-black uppercase tracking-[.2em] text-[#15803d]">You’re all set</p><h2 className="mt-3 text-3xl font-black tracking-[-.06em] text-[#0f172a]">Access unlocked!</h2><p className="mt-3 text-sm leading-6 text-[#0f172a]/65">Your lifetime WhatsApp access is ready. Pick a profile and make the first move.</p><div className="mt-6 flex items-center justify-center gap-2 text-sm font-bold text-[#166534]"><CheckCircle2 className="size-4" /> Payment verified securely</div><Button onClick={() => setPaymentCelebration(false)} className="mt-7 h-12 w-full rounded-xl bg-[#22c55e] font-bold text-[#052e16] hover:bg-[#4ade80]">Start connecting</Button></div></div>}
    {paymentBusy && <div className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 rounded-2xl bg-[#0f172a] px-5 py-4 text-sm text-white shadow-2xl"><p className="font-semibold">Opening secure checkout…</p><a href={`mailto:${SUPPORT_EMAIL}`} className="mt-1 block text-white/75 underline decoration-[#86efac] underline-offset-4 hover:text-[#86efac]">Having payment trouble? Email support: {SUPPORT_EMAIL}</a></div>}
  </div>;
}

function ProfileFeedSkeleton({ index }: { index: number }) {
  return <article aria-hidden="true" style={{ animationDelay: `${index * 90}ms` }} className="overflow-hidden rounded-[1.5rem] border border-[#dcfce7] bg-white shadow-[0_10px_35px_rgba(15,23,42,.04)]">
    <div className="skeleton-shimmer aspect-[.92] bg-[#f0fdf4]" />
    <div className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-3"><div className="space-y-2"><div className="skeleton-shimmer h-7 w-36 rounded-lg bg-[#dcfce7]" /><div className="skeleton-shimmer h-4 w-20 rounded bg-[#dcfce7]" /></div><div className="skeleton-shimmer h-7 w-28 rounded-full bg-[#dcfce7]" /></div>
      <div className="space-y-2"><div className="skeleton-shimmer h-3 w-full rounded bg-[#dcfce7]" /><div className="skeleton-shimmer h-3 w-4/5 rounded bg-[#dcfce7]" /></div>
      <div className="skeleton-shimmer h-11 w-full rounded-xl bg-[#dcfce7]" />
    </div>
  </article>;
}

function ProfileCard({ profile, index, onToggle, locked, onConnect }: { profile: Profile; index: number; onToggle: (index: number) => void; locked: boolean; onConnect: () => void }) {
  const images = profileImages(profile);
  const image = images[index] || images[0];
  return <article className="group overflow-hidden rounded-[1.5rem] border border-[#dcfce7] bg-white shadow-[0_10px_35px_rgba(15,23,42,.06)] transition-transform duration-200 hover:-translate-y-1"><div className="relative aspect-[.92] overflow-hidden rounded-t-[1.5rem] bg-[#f0fdf4]">{image ? <img src={image} alt={`${profile.full_name} profile`} className="size-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid size-full place-items-center text-[#16a34a]"><UserRound className="size-16" /></div>}{images.length === 2 && <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full border border-white/40 bg-[#0f172a]/55 px-2 py-1.5 backdrop-blur">{images.map((_, imageIndex) => <button aria-label={`Show photo ${imageIndex + 1}`} key={imageIndex} onClick={() => onToggle(imageIndex)} className={`size-1.5 rounded-full ${index === imageIndex ? "bg-[#4ade80]" : "bg-white/60"}`} />)}</div>}{images.length === 2 && <><button aria-label="Previous photo" onClick={() => onToggle(index === 0 ? 1 : 0)} className="absolute left-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 transition group-hover:opacity-100"><ChevronLeft className="size-4" /></button><button aria-label="Next photo" onClick={() => onToggle(index === 1 ? 0 : 1)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 transition group-hover:opacity-100"><ChevronRight className="size-4" /></button></>}</div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-2xl font-black tracking-[-.05em]">{profile.full_name}, {profile.age}</h3><p className="mt-1 text-sm text-[#0f172a]/55">{profile.relationship_status || "Single"}</p></div><Badge className="rounded-full bg-[#dcfce7] text-[#166534] hover:bg-[#dcfce7]">{profile.looking_for || "Something real"}</Badge></div><p className="mt-4 line-clamp-2 text-sm leading-6 text-[#0f172a]/65">{profile.bio || "Open to meeting someone kind and genuine."}</p><Button onClick={onConnect} className={`mt-5 h-11 w-full rounded-xl font-bold ${locked ? "bg-[#f0fdf4] text-[#166534] hover:bg-[#dcfce7]" : "bg-[#22c55e] text-[#052e16] hover:bg-[#4ade80]"}`}>{locked ? <LockKeyhole className="mr-2 size-4" /> : <MessageCircle className="mr-2 size-4" />}{locked ? "Connect / View WhatsApp" : "Chat on WhatsApp"}</Button></div></article>;
}
