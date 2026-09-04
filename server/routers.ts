import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  walletProfiles,
  authChallenges,
  assetNotes,
  transactions,
  transactionNotes,
  diagnosticEvents,
  portfolioSnapshots,
} from "../drizzle/schema";
import {
  isValidWavesAddress,
  validateWavesAddressStrict,
  validateAmount,
  ASSET_DECIMALS,
  ASSET_FEES,
  fetchWavesBalances,
  getExplorerUrl,
  generateTxId,
  generateChallenge,
  verifySignatureMock,
  isChallengeExpired,
  validateCallbackUrl,
  performPreflight,
} from "./crypto/waves";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

// ---------- In-memory fallback stores ----------
type MemChallenge = {
  id: number;
  challenge: string;
  publicKey?: string;
  wxAddress?: string;
  signature?: string;
  redirectUrl?: string;
  status: "pending" | "verified" | "expired" | "failed";
  createdAt: Date;
  expiresAt: Date;
  userId?: number;
};
type MemWallet = {
  id: number;
  userId: number;
  address: string;
  publicKey?: string;
  wxAddress?: string;
  network: "mainnet" | "testnet";
  status: "connected" | "disconnected" | "expired";
  lastSyncAt: Date;
  label?: string;
};
type MemAssetNote = {
  id: number;
  userId: number;
  assetId: "WAVES" | "USDT";
  label?: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};
type MemTx = {
  id: number;
  userId: number;
  asset: "WAVES" | "USDT";
  type: "send" | "receive";
  amount: string;
  fee: string;
  sender: string;
  recipient: string;
  txId?: string;
  status: "pending" | "processing" | "success" | "failed";
  explorerUrl?: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
};
type MemTxNote = { id: number; userId: number; transactionId: number; note: string; createdAt: Date; updatedAt: Date };
type MemDiag = {
  id: number;
  userId?: number;
  challenge?: string;
  signature?: string;
  publicKey?: string;
  wxAddress?: string;
  sessionStatus: "connected" | "connecting" | "expired" | "error" | "disconnected";
  redirectUrl?: string;
  createdAt: Date;
  expiresAt?: Date;
};
type MemSnapshot = {
  id: number;
  userId: number;
  address: string;
  wavesBalance: string;
  usdtBalance: string;
  lastNodeSyncAt?: Date;
  isStale: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const mem = {
  challenges: new Map<string, MemChallenge>(),
  wallets: new Map<number, MemWallet[]>(), // userId -> wallets
  assetNotes: new Map<number, MemAssetNote[]>(),
  txs: new Map<number, MemTx[]>(),
  txNotes: new Map<number, MemTxNote[]>(),
  diags: [] as MemDiag[],
  snapshots: new Map<string, MemSnapshot>(), // key `${userId}:${address}`
  idSeq: 1,
  nextId() { return this.idSeq++; },
};

// helpers to get userId fallback
function getEffectiveUserId(ctx: any): number {
  // if authenticated, use ctx.user.id, else demo 0
  if (ctx.user && ctx.user.id) return ctx.user.id;
  return 0; // demo / anonymous
}

// DB helpers with fallback
async function dbOrMem<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    const db = await getDb();
    if (!db) return fallback();
    return await fn();
  } catch (e) {
    console.warn("[crypto] DB fallback", e);
    return fallback();
  }
}

// Demo data generator
function ensureDemoData(userId: number) {
  if (mem.txs.has(userId) && (mem.txs.get(userId)?.length ?? 0) > 0) return;
  const demoAddress = "3P DemoAddressMockForCryptoBankDemoMode";
  // asset notes demo
  const notes: MemAssetNote[] = [
    { id: mem.nextId(), userId, assetId: "WAVES", label: "Основной портфель", note: "Холодное хранение, не трогать без проверки комиссии", createdAt: new Date(Date.now() - 86400000 * 2), updatedAt: new Date() },
    { id: mem.nextId(), userId, assetId: "USDT", label: "Для оплат", note: "USDT для P2P и стейбл-платежей, сеть Waves", createdAt: new Date(Date.now() - 86400000 * 5), updatedAt: new Date() },
  ];
  mem.assetNotes.set(userId, notes);

  const txs: MemTx[] = [
    { id: mem.nextId(), userId, asset: "WAVES", type: "receive", amount: "12.50000000", fee: "0.001", sender: "3P9o3ZYwtH6GnFdDxo9pA7RwQV1K5Xx9qYt", recipient: demoAddress, txId: "4Jx7a9K8mN2pQ1wR3sT5uV7xZ9bC2dE4fG6hJ8kL0mN1pQ", status: "success", explorerUrl: "https://wavesexplorer.com/tx/4Jx7a9K8mN2pQ1wR3sT5uV7xZ9bC2dE4fG6hJ8kL0mN1pQ", message: "Пополнение через WX.Network", createdAt: new Date(Date.now() - 86400000 * 1), updatedAt: new Date(Date.now() - 86400000 * 1) },
    { id: mem.nextId(), userId, asset: "USDT", type: "send", amount: "250.00", fee: "0.001", sender: demoAddress, recipient: "3PKr1L2mN3o4P5q6R7s8T9u0V1w2X3y4Z5a6B7c8D9e0F", txId: "5Ky8bN9mP0qR1sT2uV3wX4yZ5a6B7c8D9e0F1gH2jK3lM", status: "success", explorerUrl: "https://wavesexplorer.com/tx/5Ky8bN9mP0qR1sT2uV3wX4yZ5a6B7c8D9e0F1gH2jK3lM", message: "Оплата поставщику", createdAt: new Date(Date.now() - 86400000 * 3), updatedAt: new Date(Date.now() - 86400000 * 3) },
    { id: mem.nextId(), userId, asset: "WAVES", type: "send", amount: "2.00000000", fee: "0.001", sender: demoAddress, recipient: "3P8x9yZ0aB1cD2eF3gH4jK5lM6nO7pQ8rS9tU0vW1xY2z", status: "processing", message: "Тестовый перевод, ожидает подтверждения", createdAt: new Date(Date.now() - 3600000 * 5), updatedAt: new Date(Date.now() - 3600000 * 5) },
    { id: mem.nextId(), userId, asset: "USDT", type: "receive", amount: "1000.00", fee: "0.001", sender: "3PQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGh", recipient: demoAddress, txId: "6LmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuVwXyZaBcDe", status: "failed", explorerUrl: "https://wavesexplorer.com/tx/6LmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPqRsTuVwXyZaBcDe", message: "Ошибка сети, повтор не требуется", createdAt: new Date(Date.now() - 86400000 * 7), updatedAt: new Date(Date.now() - 86400000 * 7) },
    { id: mem.nextId(), userId, asset: "WAVES", type: "receive", amount: "0.50000000", fee: "0.001", sender: "3PMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdE", recipient: demoAddress, status: "pending", message: "Входящий, обработка узлом", createdAt: new Date(Date.now() - 3600000 * 1), updatedAt: new Date(Date.now() - 3600000 * 1) },
  ];
  mem.txs.set(userId, txs);

  // diags demo
  mem.diags.push({
    id: mem.nextId(),
    userId,
    challenge: "cryptobank:demo:challenge:1725432000000:abcd1234",
    publicKey: "DemoPublicKeyBase58MockForDisplayOnlyNotSecret123456",
    wxAddress: demoAddress,
    sessionStatus: "disconnected",
    redirectUrl: "cryptobank://wx-callback?challenge=demo&signature=demo",
    createdAt: new Date(Date.now() - 3600000 * 2),
    expiresAt: new Date(Date.now() + 3600000),
  });

  // wallet mock for demo mode (not connected)
  if (!mem.wallets.has(userId)) mem.wallets.set(userId, []);

  // tx notes demo
  const firstTxId = txs[0].id;
  mem.txNotes.set(firstTxId, [
    { id: mem.nextId(), userId, transactionId: firstTxId, note: "Первая успешная операция, комиссия 0.001 WAVES — сохранить для отчётности", createdAt: new Date(), updatedAt: new Date() },
  ]);
}

// Ensure demo for anon too
ensureDemoData(0);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // WX.Network session status
    wxSession: publicProcedure.query(async ({ ctx }) => {
      const userId = getEffectiveUserId(ctx);
      ensureDemoData(userId);
      const db = await getDb();
      // Try DB else mem
      if (db) {
        try {
          const rows = await db.select().from(walletProfiles).where(eq(walletProfiles.userId, userId)).limit(1);
          if (rows.length > 0) {
            const w = rows[0];
            return {
              status: w.status,
              address: w.address,
              publicKey: w.publicKey,
              wxAddress: w.wxAddress,
              network: w.network,
              lastSyncAt: w.lastSyncAt,
              isDemo: false,
            };
          }
        } catch {}
      }
      const wallets = mem.wallets.get(userId) ?? [];
      const w = wallets.find(x => x.status === "connected") ?? wallets[0];
      if (w) {
        return {
          status: w.status,
          address: w.address,
          publicKey: w.publicKey,
          wxAddress: w.wxAddress,
          network: w.network,
          lastSyncAt: w.lastSyncAt,
          isDemo: userId === 0,
        };
      }
      return {
        status: "disconnected" as const,
        address: null,
        publicKey: null,
        wxAddress: null,
        network: "mainnet" as const,
        lastSyncAt: null,
        isDemo: true,
      };
    }),
  }),

  wallet: router({
    // Create challenge for WX.Network Web Auth
    createChallenge: publicProcedure
      .input(z.object({
        addressHint: z.string().optional(),
        redirectUrl: z.string().optional(),
        network: z.enum(["mainnet", "testnet"]).default("mainnet"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { challenge, expiresAt, createdAt } = generateChallenge(input.addressHint);
        const userId = getEffectiveUserId(ctx);
        const redirectUrl = input.redirectUrl ?? `cryptobank://wx-callback?challenge=${encodeURIComponent(challenge)}`;

        if (!validateCallbackUrl(redirectUrl)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Некорректный redirect URL" });
        }

        const memEntry: MemChallenge = {
          id: mem.nextId(),
          challenge,
          redirectUrl,
          status: "pending",
          createdAt,
          expiresAt,
          userId,
        };
        mem.challenges.set(challenge, memEntry);

        // try DB
        try {
          const db = await getDb();
          if (db) {
            await db.insert(authChallenges).values({
              challenge,
              userId,
              redirectUrl,
              status: "pending",
              createdAt,
              expiresAt,
            });
          }
        } catch {}

        // diagnostic event creation
        mem.diags.push({
          id: mem.nextId(),
          userId,
          challenge,
          sessionStatus: "connecting",
          redirectUrl,
          createdAt,
          expiresAt,
        });
        try {
          const db = await getDb();
          if (db) await db.insert(diagnosticEvents).values({
            userId,
            challenge,
            sessionStatus: "connecting",
            redirectUrl,
            createdAt,
            expiresAt,
          } as any);
        } catch {}

        // WX.Network deep link simulation: wx.network auth URL
        const wxAuthUrl = `https://wx.network/auth?challenge=${encodeURIComponent(challenge)}&redirectUrl=${encodeURIComponent(redirectUrl)}&network=${input.network}`;

        return {
          challenge,
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          redirectUrl,
          wxAuthUrl,
          deepLink: `cryptobank://wx-callback?challenge=${encodeURIComponent(challenge)}`,
        };
      }),

    verifyChallenge: publicProcedure
      .input(z.object({
        challenge: z.string().min(10),
        signature: z.string().min(10),
        publicKey: z.string().min(10),
        wxAddress: z.string().min(10),
        network: z.enum(["mainnet", "testnet"]).default("mainnet"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { challenge, signature, publicKey, wxAddress, network } = input;
        const userId = getEffectiveUserId(ctx);

        const memEntry = mem.challenges.get(challenge);
        if (!memEntry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Challenge не найден или истёк" });
        }
        if (isChallengeExpired(memEntry.expiresAt)) {
          memEntry.status = "expired";
          throw new TRPCError({ code: "BAD_REQUEST", message: "Challenge истёк, создайте новый" });
        }
        if (memEntry.status === "verified") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Challenge уже использован" });
        }

        // validate address
        const addrCheck = validateWavesAddressStrict(wxAddress);
        if (!addrCheck.valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: addrCheck.error ?? "Некорректный адрес" });
        }

        const ok = verifySignatureMock(challenge, signature, publicKey);
        if (!ok) {
          memEntry.status = "failed";
          mem.diags.push({
            id: mem.nextId(),
            userId,
            challenge,
            signature: signature.slice(0, 20) + "...",
            publicKey: publicKey.slice(0, 20) + "...",
            wxAddress,
            sessionStatus: "error",
            redirectUrl: memEntry.redirectUrl,
            createdAt: new Date(),
            expiresAt: memEntry.expiresAt,
          });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Подпись не прошла проверку" });
        }

        // success
        memEntry.status = "verified";
        memEntry.signature = signature;
        memEntry.publicKey = publicKey;
        memEntry.wxAddress = wxAddress;

        try {
          const db = await getDb();
          if (db) {
            await db.insert(authChallenges).values({
              challenge,
              userId,
              publicKey,
              wxAddress,
              signature,
              redirectUrl: memEntry.redirectUrl,
              status: "verified",
              createdAt: memEntry.createdAt,
              expiresAt: memEntry.expiresAt,
            } as any).onDuplicateKeyUpdate?.({ set: { status: "verified", signature, publicKey, wxAddress } } as any);
          }
        } catch {}

        // create wallet profile
        const wallet: MemWallet = {
          id: mem.nextId(),
          userId,
          address: wxAddress,
          publicKey,
          wxAddress,
          network,
          status: "connected",
          lastSyncAt: new Date(),
        };
        const list = mem.wallets.get(userId) ?? [];
        // replace existing
        const idx = list.findIndex(w => w.address === wxAddress);
        if (idx >= 0) list[idx] = wallet; else list.unshift(wallet);
        mem.wallets.set(userId, list);

        try {
          const db = await getDb();
          if (db) {
            await db.insert(walletProfiles).values({
              userId,
              address: wxAddress,
              publicKey,
              wxAddress,
              network,
              status: "connected",
              lastSyncAt: new Date(),
            } as any).onDuplicateKeyUpdate?.({ set: { publicKey, wxAddress, network, status: "connected", lastSyncAt: new Date() } } as any);
          }
        } catch {}

        mem.diags.push({
          id: mem.nextId(),
          userId,
          challenge,
          signature: signature.slice(0, 24) + "…",
          publicKey: publicKey.slice(0, 24) + "…",
          wxAddress,
          sessionStatus: "connected",
          redirectUrl: memEntry.redirectUrl,
          createdAt: new Date(),
          expiresAt: memEntry.expiresAt,
        });
        try {
          const db = await getDb();
          if (db) await db.insert(diagnosticEvents).values({
            userId,
            challenge,
            signature: signature.slice(0, 24) + "…",
            publicKey: publicKey.slice(0, 24) + "…",
            wxAddress,
            sessionStatus: "connected",
            redirectUrl: memEntry.redirectUrl,
            createdAt: new Date(),
            expiresAt: memEntry.expiresAt,
          } as any);
        } catch {}

        return {
          success: true,
          address: wxAddress,
          publicKey,
          network,
          status: "connected" as const,
        };
      }),

    disconnect: publicProcedure.mutation(async ({ ctx }) => {
      const userId = getEffectiveUserId(ctx);
      const list = mem.wallets.get(userId) ?? [];
      list.forEach(w => w.status = "disconnected");
      mem.wallets.set(userId, list);

      try {
        const db = await getDb();
        if (db) {
          // update all wallets for user to disconnected – simplified via raw
        }
      } catch {}

      mem.diags.push({
        id: mem.nextId(),
        userId,
        sessionStatus: "disconnected",
        createdAt: new Date(),
      });

      return { success: true };
    }),

    getProfile: publicProcedure.query(async ({ ctx }) => {
      const userId = getEffectiveUserId(ctx);
      ensureDemoData(userId);
      const wallets = mem.wallets.get(userId) ?? [];
      const connected = wallets.find(w => w.status === "connected");
      return connected ?? null;
    }),

    getBalances: publicProcedure
      .input(z.object({
        address: z.string().min(10),
        network: z.enum(["mainnet", "testnet"]).default("mainnet"),
        forceRefresh: z.boolean().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        const { address, network } = input;

        const addrCheck = validateWavesAddressStrict(address);
        // allow demo address for demo mode
        const isDemoAddress = address.includes("Demo");
        if (!addrCheck.valid && !isDemoAddress) {
          throw new TRPCError({ code: "BAD_REQUEST", message: addrCheck.error ?? "Некорректный адрес" });
        }

        // Try fetch from Waves Node mock
        try {
          const res = await fetchWavesBalances(address, network);
          // cache snapshot
          const key = `${userId}:${address}`;
          const snap: MemSnapshot = {
            id: mem.nextId(),
            userId,
            address,
            wavesBalance: res.waves,
            usdtBalance: res.usdt,
            lastNodeSyncAt: new Date(),
            isStale: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mem.snapshots.set(key, snap);
          // try DB
          try {
            const db = await getDb();
            if (db) await db.insert(portfolioSnapshots).values({
              userId,
              address,
              wavesBalance: res.waves,
              usdtBalance: res.usdt,
              lastNodeSyncAt: new Date(),
              isStale: false,
            } as any).onDuplicateKeyUpdate?.({ set: { wavesBalance: res.waves, usdtBalance: res.usdt, lastNodeSyncAt: new Date(), isStale: false } } as any);
          } catch {}
          return res;
        } catch (e: any) {
          // fallback to last snapshot
          const key = `${userId}:${address}`;
          const snap = mem.snapshots.get(key);
          if (snap) {
            return {
              address,
              network,
              waves: snap.wavesBalance,
              usdt: snap.usdtBalance,
              lastUpdated: snap.lastNodeSyncAt?.toISOString() ?? new Date().toISOString(),
              isStale: true,
              source: "cache" as const,
              warning: e.message ?? "Waves Node недоступен, показано последнее сохранённое значение",
            };
          }
          // if no snapshot, return demo balances with stale flag
          return {
            address,
            network,
            waves: "12.34567890",
            usdt: "1234.567890",
            lastUpdated: new Date(Date.now() - 3600000).toISOString(),
            isStale: true,
            source: "cache" as const,
            warning: "Waves Node недоступен, показаны демо-данные",
          };
        }
      }),

    listWallets: publicProcedure.query(async ({ ctx }) => {
      const userId = getEffectiveUserId(ctx);
      return mem.wallets.get(userId) ?? [];
    }),
  }),

  assets: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const userId = getEffectiveUserId(ctx);
      ensureDemoData(userId);
      const notes = mem.assetNotes.get(userId) ?? [];
      // balances mock
      const wallets = mem.wallets.get(userId) ?? [];
      const addr = wallets.find(w => w.status === "connected")?.address ?? "3P DemoAddressMockForCryptoBankDemoMode";
      let balances: { waves: string; usdt: string; lastUpdated: string; isStale: boolean } | null = null;
      try {
        const b = await fetchWavesBalances(addr, "mainnet");
        balances = { waves: b.waves, usdt: b.usdt, lastUpdated: b.lastUpdated, isStale: b.isStale };
      } catch {
        const snap = mem.snapshots.get(`${userId}:${addr}`);
        if (snap) balances = { waves: snap.wavesBalance, usdt: snap.usdtBalance, lastUpdated: snap.lastNodeSyncAt?.toISOString() ?? new Date().toISOString(), isStale: true };
        else balances = { waves: "12.34567890", usdt: "1234.567890", lastUpdated: new Date().toISOString(), isStale: false };
      }

      const assets = [
        {
          id: "WAVES" as const,
          symbol: "WAVES",
          name: "Waves",
          network: "Waves Mainnet",
          decimals: ASSET_DECIMALS.WAVES,
          balance: balances?.waves ?? "0",
          isStale: balances?.isStale ?? false,
          lastUpdated: balances?.lastUpdated ?? new Date().toISOString(),
          priceChange24h: "+2.34%",
          priceUsd: "2.18",
          note: notes.find(n => n.assetId === "WAVES") ?? null,
        },
        {
          id: "USDT" as const,
          symbol: "USDT",
          name: "Tether USD",
          network: "Waves Mainnet",
          decimals: ASSET_DECIMALS.USDT,
          balance: balances?.usdt ?? "0",
          isStale: balances?.isStale ?? false,
          lastUpdated: balances?.lastUpdated ?? new Date().toISOString(),
          priceChange24h: "+0.01%",
          priceUsd: "1.00",
          assetId: "DG2xFkPdDwKUoBkzGAhQtLpSGzfXLiCYPEzeKH2Ad24p",
          note: notes.find(n => n.assetId === "USDT") ?? null,
        },
      ];
      return assets;
    }),

    get: publicProcedure.input(z.object({ assetId: z.enum(["WAVES", "USDT"]) })).query(async ({ ctx, input }) => {
      const userId = getEffectiveUserId(ctx);
      ensureDemoData(userId);
      const notes = mem.assetNotes.get(userId) ?? [];
      return notes.find(n => n.assetId === input.assetId) ?? null;
    }),

    upsertNote: publicProcedure
      .input(z.object({
        assetId: z.enum(["WAVES", "USDT"]),
        label: z.string().max(100).optional(),
        note: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        const list = mem.assetNotes.get(userId) ?? [];
        let existing = list.find(n => n.assetId === input.assetId);
        if (existing) {
          existing.label = input.label ?? existing.label;
          existing.note = input.note ?? existing.note;
          existing.updatedAt = new Date();
        } else {
          existing = {
            id: mem.nextId(),
            userId,
            assetId: input.assetId,
            label: input.label,
            note: input.note,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          list.push(existing);
        }
        mem.assetNotes.set(userId, list);

        try {
          const db = await getDb();
          if (db) {
            // upsert
            const existingDb = await db.select().from(assetNotes).where(and(eq(assetNotes.userId, userId), eq(assetNotes.assetId, input.assetId))).limit(1);
            if (existingDb.length > 0) {
              await db.update(assetNotes).set({ label: input.label, note: input.note, updatedAt: new Date() }).where(eq(assetNotes.id, existingDb[0].id));
            } else {
              await db.insert(assetNotes).values({ userId, assetId: input.assetId, label: input.label, note: input.note } as any);
            }
          }
        } catch {}

        return existing;
      }),

    deleteNote: publicProcedure
      .input(z.object({ assetId: z.enum(["WAVES", "USDT"]) }))
      .mutation(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        const list = mem.assetNotes.get(userId) ?? [];
        const filtered = list.filter(n => n.assetId !== input.assetId);
        mem.assetNotes.set(userId, filtered);
        try {
          const db = await getDb();
          if (db) await db.delete(assetNotes).where(and(eq(assetNotes.userId, userId), eq(assetNotes.assetId, input.assetId)));
        } catch {}
        return { success: true };
      }),

    refreshBalance: publicProcedure
      .input(z.object({ address: z.string().min(10), network: z.enum(["mainnet", "testnet"]).default("mainnet") }))
      .mutation(async ({ ctx, input }) => {
        // same as wallet.getBalances but mutation for refresh button
        const userId = getEffectiveUserId(ctx);
        try {
          const res = await fetchWavesBalances(input.address, input.network);
          const key = `${userId}:${input.address}`;
          mem.snapshots.set(key, {
            id: mem.nextId(),
            userId,
            address: input.address,
            wavesBalance: res.waves,
            usdtBalance: res.usdt,
            lastNodeSyncAt: new Date(),
            isStale: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          return res;
        } catch (e: any) {
          throw new TRPCError({ code: "BAD_GATEWAY", message: e.message ?? "Waves Node недоступен" });
        }
      }),
  }),

  transactions: router({
    list: publicProcedure
      .input(z.object({
        asset: z.enum(["WAVES", "USDT"]).optional(),
        status: z.enum(["pending", "processing", "success", "failed"]).optional(),
        type: z.enum(["send", "receive"]).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        ensureDemoData(userId);
        let list = mem.txs.get(userId) ?? [];
        // filters
        if (input?.asset) list = list.filter(t => t.asset === input.asset);
        if (input?.status) list = list.filter(t => t.status === input.status);
        if (input?.type) list = list.filter(t => t.type === input.type);
        if (input?.dateFrom) {
          const from = new Date(input.dateFrom);
          list = list.filter(t => t.createdAt >= from);
        }
        if (input?.dateTo) {
          const to = new Date(input.dateTo);
          list = list.filter(t => t.createdAt <= to);
        }
        if (input?.search) {
          const s = input.search.toLowerCase();
          list = list.filter(t => t.txId?.toLowerCase().includes(s) || t.recipient.toLowerCase().includes(s) || t.sender.toLowerCase().includes(s) || t.amount.includes(s));
        }
        // sort desc
        list = [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const total = list.length;
        const paged = list.slice(input?.offset ?? 0, (input?.offset ?? 0) + (input?.limit ?? 50));
        // attach notes
        const withNotes = paged.map(tx => {
          const notes = mem.txNotes.get(tx.id) ?? [];
          return { ...tx, notes, explorerUrl: tx.explorerUrl ?? (tx.txId ? getExplorerUrl(tx.txId) : undefined), createdAt: tx.createdAt.toISOString(), updatedAt: tx.updatedAt.toISOString() };
        });
        return { items: withNotes, total };
      }),

    get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const userId = getEffectiveUserId(ctx);
      const list = mem.txs.get(userId) ?? [];
      const tx = list.find(t => t.id === input.id);
      if (!tx) throw new TRPCError({ code: "NOT_FOUND", message: "Транзакция не найдена" });
      const notes = mem.txNotes.get(tx.id) ?? [];
      return { ...tx, notes, explorerUrl: tx.explorerUrl ?? (tx.txId ? getExplorerUrl(tx.txId) : undefined), createdAt: tx.createdAt.toISOString(), updatedAt: tx.updatedAt.toISOString() };
    }),

    addNote: publicProcedure
      .input(z.object({ transactionId: z.number(), note: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        const list = mem.txs.get(userId) ?? [];
        const tx = list.find(t => t.id === input.transactionId);
        if (!tx) throw new TRPCError({ code: "NOT_FOUND", message: "Транзакция не найдена" });
        const note: MemTxNote = { id: mem.nextId(), userId, transactionId: input.transactionId, note: input.note, createdAt: new Date(), updatedAt: new Date() };
        const existing = mem.txNotes.get(input.transactionId) ?? [];
        existing.push(note);
        mem.txNotes.set(input.transactionId, existing);
        try {
          const db = await getDb();
          if (db) await db.insert(transactionNotes).values({ userId, transactionId: input.transactionId, note: input.note } as any);
        } catch {}
        return note;
      }),

    updateNote: publicProcedure
      .input(z.object({ noteId: z.number(), transactionId: z.number(), note: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        const notes = mem.txNotes.get(input.transactionId) ?? [];
        const n = notes.find(x => x.id === input.noteId);
        if (!n) throw new TRPCError({ code: "NOT_FOUND", message: "Заметка не найдена" });
        if (n.userId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа" });
        n.note = input.note;
        n.updatedAt = new Date();
        try {
          const db = await getDb();
          if (db) await db.update(transactionNotes).set({ note: input.note, updatedAt: new Date() }).where(eq(transactionNotes.id, input.noteId));
        } catch {}
        return n;
      }),

    deleteNote: publicProcedure
      .input(z.object({ noteId: z.number(), transactionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        const notes = mem.txNotes.get(input.transactionId) ?? [];
        const idx = notes.findIndex(x => x.id === input.noteId);
        if (idx === -1) throw new TRPCError({ code: "NOT_FOUND", message: "Заметка не найдена" });
        if (notes[idx].userId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "Нет доступа" });
        notes.splice(idx, 1);
        mem.txNotes.set(input.transactionId, notes);
        try {
          const db = await getDb();
          if (db) await db.delete(transactionNotes).where(eq(transactionNotes.id, input.noteId));
        } catch {}
        return { success: true };
      }),

    // For demo: create mock receive tx
    createDemo: publicProcedure
      .input(z.object({ asset: z.enum(["WAVES", "USDT"]), amount: z.string(), type: z.enum(["send", "receive"]).default("receive") }))
      .mutation(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        const wallets = mem.wallets.get(userId) ?? [];
        const addr = wallets.find(w => w.status === "connected")?.address ?? "3P DemoAddressMockForCryptoBankDemoMode";
        const tx: MemTx = {
          id: mem.nextId(),
          userId,
          asset: input.asset,
          type: input.type,
          amount: input.amount,
          fee: ASSET_FEES[input.asset],
          sender: input.type === "receive" ? "3P DemoSenderMockAddressForTestingPurposesXx" : addr,
          recipient: input.type === "receive" ? addr : "3P DemoRecipientMockAddressForTestingYy",
          status: "success",
          txId: generateTxId(),
          explorerUrl: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        tx.explorerUrl = tx.txId ? getExplorerUrl(tx.txId) : undefined;
        const list = mem.txs.get(userId) ?? [];
        list.unshift(tx);
        mem.txs.set(userId, list);
        return { ...tx, createdAt: tx.createdAt.toISOString(), updatedAt: tx.updatedAt.toISOString() };
      }),
  }),

  send: router({
    preflight: publicProcedure
      .input(z.object({
        asset: z.enum(["WAVES", "USDT"]),
        recipient: z.string().min(10),
        amount: z.string().min(1),
        sender: z.string().min(10).optional(),
        message: z.string().max(140).optional(),
        network: z.enum(["mainnet", "testnet"]).default("mainnet"),
      }))
      .query(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        const wallets = mem.wallets.get(userId) ?? [];
        const sender = input.sender ?? wallets.find(w => w.status === "connected")?.address ?? "3P DemoAddressMockForCryptoBankDemoMode";
        // get balances
        let balances = { waves: "12.34567890", usdt: "1234.567890" };
        try {
          const b = await fetchWavesBalances(sender, input.network);
          balances = { waves: b.waves, usdt: b.usdt };
        } catch {
          const snap = mem.snapshots.get(`${userId}:${sender}`);
          if (snap) balances = { waves: snap.wavesBalance, usdt: snap.usdtBalance };
        }

        const result = performPreflight(
          { asset: input.asset, recipient: input.recipient, amount: input.amount, sender, message: input.message },
          balances
        );
        return { ...result, balances, sender };
      }),

    broadcast: publicProcedure
      .input(z.object({
        asset: z.enum(["WAVES", "USDT"]),
        recipient: z.string().min(10),
        amount: z.string().min(1),
        sender: z.string().min(10).optional(),
        message: z.string().max(140).optional(),
        signature: z.string().min(10).optional(), // from external wallet
        publicKey: z.string().min(10).optional(),
        idempotencyKey: z.string().min(5).optional(),
        network: z.enum(["mainnet", "testnet"]).default("mainnet"),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        const wallets = mem.wallets.get(userId) ?? [];
        const sender = input.sender ?? wallets.find(w => w.status === "connected")?.address;

        if (!sender) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Кошелёк не подключён" });
        }

        // demo mode guard – if address is demo, block real send
        if (sender.includes("Demo") || userId === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Демо-режим: отправка реальных средств недоступна. Подключите WX.Network кошелёк." });
        }

        // require explicit signature (simulated Keeper/WalletConnect confirmation)
        if (!input.signature) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Требуется подпись транзакции внешним кошельком" });
        }

        // idempotency check – simple in-mem
        const idemKey = input.idempotencyKey ?? `${sender}:${input.recipient}:${input.amount}:${input.asset}`;
        const existingTxs = mem.txs.get(userId) ?? [];
        const duplicate = existingTxs.find(t => t.sender === sender && t.recipient === input.recipient && t.amount === input.amount && t.asset === input.asset && Date.now() - t.createdAt.getTime() < 30000);
        if (duplicate) {
          throw new TRPCError({ code: "CONFLICT", message: "Повторная отправка заблокирована. Транзакция уже создаётся." });
        }

        // get balances
        let balances = { waves: "12.34567890", usdt: "1234.567890" };
        try {
          const b = await fetchWavesBalances(sender, input.network);
          balances = { waves: b.waves, usdt: b.usdt };
        } catch {
          const snap = mem.snapshots.get(`${userId}:${sender}`);
          if (snap) balances = { waves: snap.wavesBalance, usdt: snap.usdtBalance };
        }

        const preflight = performPreflight(
          { asset: input.asset, recipient: input.recipient, amount: input.amount, sender, message: input.message },
          balances
        );
        if (!preflight.valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: preflight.errors.join(", ") });
        }

        // Simulate broadcast delay
        await new Promise(r => setTimeout(r, 800));

        // Simulate random broadcast failure 5%
        if (Math.random() < 0.05) {
          const failedTx: MemTx = {
            id: mem.nextId(),
            userId,
            asset: input.asset,
            type: "send",
            amount: input.amount,
            fee: preflight.fee,
            sender,
            recipient: input.recipient,
            status: "failed",
            message: input.message,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const list = mem.txs.get(userId) ?? [];
          list.unshift(failedTx);
          mem.txs.set(userId, list);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Ошибка broadcast: Waves Node отклонил транзакцию" });
        }

        const txId = generateTxId();
        const tx: MemTx = {
          id: mem.nextId(),
          userId,
          asset: input.asset,
          type: "send",
          amount: input.amount,
          fee: preflight.fee,
          sender,
          recipient: input.recipient,
          txId,
          status: "success",
          explorerUrl: getExplorerUrl(txId, input.network),
          message: input.message,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const list = mem.txs.get(userId) ?? [];
        list.unshift(tx);
        mem.txs.set(userId, list);

        // update snapshot optimistically
        const key = `${userId}:${sender}`;
        const snap = mem.snapshots.get(key);
        if (snap) {
          if (input.asset === "WAVES") {
            const newBal = (Number(snap.wavesBalance) - Number(input.amount) - Number(preflight.fee)).toFixed(8);
            snap.wavesBalance = newBal;
          } else {
            const newBal = (Number(snap.usdtBalance) - Number(input.amount)).toFixed(6);
            snap.usdtBalance = newBal;
            snap.wavesBalance = (Number(snap.wavesBalance) - Number(preflight.fee)).toFixed(8);
          }
          snap.updatedAt = new Date();
          snap.lastNodeSyncAt = new Date();
        }

        try {
          const db = await getDb();
          if (db) await db.insert(transactions).values({
            userId,
            asset: input.asset,
            type: "send",
            amount: input.amount,
            fee: preflight.fee,
            sender,
            recipient: input.recipient,
            txId,
            status: "success",
            explorerUrl: getExplorerUrl(txId, input.network),
            message: input.message,
          } as any);
        } catch {}

        return {
          success: true,
          txId,
          explorerUrl: getExplorerUrl(txId, input.network),
          status: "success" as const,
          fee: preflight.fee,
        };
      }),
  }),

  diagnostics: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const userId = getEffectiveUserId(ctx);
      // return mem diags filtered
      const userDiags = mem.diags.filter(d => d.userId === userId || d.userId === 0).slice(-20).reverse();
      // add DB if available
      try {
        const db = await getDb();
        if (db) {
          const rows = await db.select().from(diagnosticEvents).where(eq(diagnosticEvents.userId, userId)).orderBy(desc(diagnosticEvents.createdAt)).limit(20);
          if (rows.length > 0) return rows;
        }
      } catch {}
      return userDiags.map(d => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        expiresAt: d.expiresAt?.toISOString() ?? null,
      }));
    }),

    createEvent: publicProcedure
      .input(z.object({
        challenge: z.string().optional(),
        signature: z.string().optional(),
        publicKey: z.string().optional(),
        wxAddress: z.string().optional(),
        sessionStatus: z.enum(["connected", "connecting", "expired", "error", "disconnected"]),
        redirectUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = getEffectiveUserId(ctx);
        const entry: MemDiag = {
          id: mem.nextId(),
          userId,
          challenge: input.challenge,
          signature: input.signature ? input.signature.slice(0, 24) + "…" : undefined,
          publicKey: input.publicKey ? input.publicKey.slice(0, 24) + "…" : undefined,
          wxAddress: input.wxAddress,
          sessionStatus: input.sessionStatus,
          redirectUrl: input.redirectUrl,
          createdAt: new Date(),
          expiresAt: input.challenge ? new Date(Date.now() + 5 * 60 * 1000) : undefined,
        };
        mem.diags.push(entry);
        try {
          const db = await getDb();
          if (db) await db.insert(diagnosticEvents).values({
            userId,
            challenge: input.challenge,
            signature: entry.signature,
            publicKey: entry.publicKey,
            wxAddress: input.wxAddress,
            sessionStatus: input.sessionStatus,
            redirectUrl: input.redirectUrl,
            createdAt: new Date(),
            expiresAt: entry.expiresAt,
          } as any);
        } catch {}
        return { ...entry, createdAt: entry.createdAt.toISOString(), expiresAt: entry.expiresAt?.toISOString() ?? null };
      }),

    getReport: publicProcedure.query(async ({ ctx }) => {
      const userId = getEffectiveUserId(ctx);
      const wallets = mem.wallets.get(userId) ?? [];
      const w = wallets.find(x => x.status === "connected");
      const challenges = Array.from(mem.challenges.values()).filter(c => c.userId === userId).slice(-5);
      const diags = mem.diags.filter(d => d.userId === userId).slice(-5);
      return {
        generatedAt: new Date().toISOString(),
        userId,
        wallet: w ? { address: w.address, publicKey: w.publicKey ? w.publicKey.slice(0,16)+"…" : null, network: w.network, status: w.status, lastSyncAt: w.lastSyncAt.toISOString() } : null,
        challenges: challenges.map(c => ({ challenge: c.challenge, status: c.status, createdAt: c.createdAt.toISOString(), expiresAt: c.expiresAt.toISOString(), redirectUrl: c.redirectUrl })),
        diagnostics: diags.map(d => ({ sessionStatus: d.sessionStatus, createdAt: d.createdAt.toISOString(), wxAddress: d.wxAddress, hasChallenge: !!d.challenge, hasSignature: !!d.signature })),
        note: "Отчёт не содержит приватных ключей и seed-фраз",
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
