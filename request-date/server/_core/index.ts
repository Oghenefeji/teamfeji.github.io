import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.post("/api/payments/verify", async (req, res) => {
    const { transaction_id, access_token } = req.body as { transaction_id?: string | number; access_token?: string };
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const flutterwaveSecret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!transaction_id || !access_token || !supabaseUrl || !anonKey || !serviceKey || !flutterwaveSecret) return res.status(400).json({ error: "Payment verification is not configured" });
    try {
      const identity = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${access_token}` } });
      if (!identity.ok) return res.status(401).json({ error: "Invalid member session" });
      const member = await identity.json() as { id: string; email?: string };
      const verification = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, { headers: { Authorization: `Bearer ${flutterwaveSecret}` } });
      const payment = await verification.json() as { status?: string; data?: { status?: string; amount?: number; currency?: string; tx_ref?: string; flw_ref?: string } };
      const verified = verification.ok && payment.status === "success" && (payment.data?.status === "successful" || payment.data?.status === "completed") && payment.data.currency === "NGN" && Number(payment.data.amount) >= 1500;
      if (!verified) return res.status(402).json({ error: "Payment could not be verified" });
      const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" };
      const reference = payment.data?.tx_ref || String(transaction_id);
      const saved = await fetch(`${supabaseUrl}/rest/v1/payments`, { method: "POST", headers, body: JSON.stringify({ user_id: member.id, transaction_ref: reference, flw_ref: payment.data?.flw_ref || String(transaction_id), amount: 1500, status: "successful" }) });
      if (!saved.ok && saved.status !== 409) return res.status(500).json({ error: "Could not persist payment" });
      const unlocked = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${member.id}`, { method: "PATCH", headers, body: JSON.stringify({ has_paid: true }) });
      if (!unlocked.ok) return res.status(500).json({ error: "Could not unlock access" });
      return res.json({ success: true, user_id: member.id });
    } catch (error) { console.error("[Payments] Verification failed", error); return res.status(500).json({ error: "Payment verification failed" }); }
  });
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
