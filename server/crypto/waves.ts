import { z } from "zod";

// WAVES address validation – Waves mainnet addresses start with 3P..., testnet 3N..., length 35, base58
const BASE58_REGEX = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

export function isValidWavesAddress(address: string, network: "mainnet" | "testnet" = "mainnet"): boolean {
  if (!address || typeof address !== "string") return false;
  const trimmed = address.trim();
  if (trimmed.length !== 35) return false;
  if (!BASE58_REGEX.test(trimmed)) return false;
  // Mainnet prefix 3P, testnet 3N (Waves)
  if (network === "mainnet" && !trimmed.startsWith("3P")) return false;
  if (network === "testnet" && !trimmed.startsWith("3N")) return false;
  // For generic check allow both prefixes
  if (network === "mainnet" && !(trimmed.startsWith("3P") || trimmed.startsWith("3N"))) return false;
  return true;
}

export function validateWavesAddressStrict(address: string): { valid: boolean; error?: string } {
  if (!address) return { valid: false, error: "Адрес обязателен" };
  const a = address.trim();
  if (a.length !== 35) return { valid: false, error: "Адрес должен содержать 35 символов" };
  if (!BASE58_REGEX.test(a)) return { valid: false, error: "Некорректные символы Base58" };
  if (!(a.startsWith("3P") || a.startsWith("3N"))) return { valid: false, error: "Адрес должен начинаться с 3P (mainnet) или 3N (testnet)" };
  return { valid: true };
}

// Asset precision
export const ASSET_DECIMALS: Record<string, number> = {
  WAVES: 8,
  USDT: 6, // USDT on Waves: 6 decimals (common), sometimes 6
};

export const ASSET_FEES: Record<string, string> = {
  WAVES: "0.001",
  USDT: "0.001", // WAVES fee for token transfers is also in WAVES
};

export const MIN_REMAINING_WAVES = 0.001; // keep at least fee

export function validateAmount(amount: string, asset: "WAVES" | "USDT", balanceWaves?: string, balanceAsset?: string): { valid: boolean; error?: string } {
  if (!amount) return { valid: false, error: "Сумма обязательна" };
  const dec = ASSET_DECIMALS[asset];
  if (isNaN(Number(amount))) return { valid: false, error: "Некорректная сумма" };
  const num = Number(amount);
  if (num <= 0) return { valid: false, error: "Сумма должна быть больше 0" };
  // precision check
  const parts = amount.split(".");
  if (parts[1] && parts[1].length > dec) return { valid: false, error: `Слишком много знаков после запятой, максимум ${dec}` };
  // minimal amount
  if (num < 0.00000001) return { valid: false, error: "Сумма слишком мала" };

  // balance check if provided
  if (balanceAsset !== undefined) {
    const bal = Number(balanceAsset);
    if (num > bal) return { valid: false, error: "Недостаточно средств" };
  }
  // For WAVES need to keep fee
  if (asset === "WAVES" && balanceWaves !== undefined) {
    const bal = Number(balanceWaves);
    const fee = Number(ASSET_FEES.WAVES);
    if (num + fee > bal) return { valid: false, error: `Недостаточно WAVES для комиссии. Доступно ${bal}, нужно ${num + fee}` };
  }
  if (asset === "USDT" && balanceWaves !== undefined) {
    const balWaves = Number(balanceWaves);
    const fee = Number(ASSET_FEES.WAVES);
    if (balWaves < fee) return { valid: false, error: `Недостаточно WAVES для комиссии (${fee} WAVES)` };
  }

  return { valid: true };
}

export function toSmallestUnit(amount: string, decimals: number): bigint {
  const [intPart, fracPart = ""] = amount.split(".");
  const padded = (fracPart + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(intPart + padded || "0");
}

export function fromSmallestUnit(value: string | bigint, decimals: number): string {
  const bi = typeof value === "string" ? BigInt(value) : value;
  const divisor = BigInt(10 ** decimals);
  const intPart = bi / divisor;
  const fracPart = bi % divisor;
  if (fracPart === BigInt(0)) return intPart.toString();
  const fracStr = fracPart.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${intPart}.${fracStr}`;
}

// Mock Waves Node API
const WAVES_ASSET_ID = "WAVES";
const USDT_ASSET_ID = "DG2xFkPdDwKUoBkzGAhQtLpSGzfXLiCYPEzeKH2Ad24p"; // USDT on Waves mainnet

export type BalanceResponse = {
  address: string;
  network: "mainnet" | "testnet";
  waves: string;
  usdt: string;
  lastUpdated: string;
  isStale: boolean;
  source: "node" | "cache";
};

// Simulate Waves Node fetch – in real would call https://nodes.wavesnodes.com/addresses/balance etc
export async function fetchWavesBalances(address: string, network: "mainnet" | "testnet" = "mainnet"): Promise<BalanceResponse> {
  // simulate network latency
  await new Promise(r => setTimeout(r, 300 + Math.random() * 400));

  // Simulate occasional node unavailability (10% chance)
  if (Math.random() < 0.08) {
    throw new Error("Waves Node недоступен");
  }

  if (!isValidWavesAddress(address, network)) {
    // for demo addresses allow mock
    if (address.startsWith("3P") || address.startsWith("3N")) {
      // ok
    } else {
      throw new Error("Некорректный адрес Waves");
    }
  }

  // deterministic mock based on address hash
  let hash = 0;
  for (let i = 0; i < address.length; i++) hash = (hash * 31 + address.charCodeAt(i)) % 1000000;
  const wavesBase = 10 + (hash % 5000) / 100; // 10..60 WAVES
  const usdtBase = 100 + (hash % 20000) / 10; // 100..2100 USDT

  // add some random fluctuation per call
  const waves = (wavesBase + (Math.random() - 0.5) * 2).toFixed(8);
  const usdt = (usdtBase + (Math.random() - 0.5) * 10).toFixed(6);

  return {
    address,
    network,
    waves,
    usdt,
    lastUpdated: new Date().toISOString(),
    isStale: false,
    source: "node",
  };
}

export function getExplorerUrl(txId: string, network: "mainnet" | "testnet" = "mainnet"): string {
  const base = network === "testnet" ? "https://testnet.wavesexplorer.com/tx" : "https://wavesexplorer.com/tx";
  return `${base}/${txId}`;
}

export function generateTxId(): string {
  // Waves tx id is base58 44 chars, mock with random base58-like
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 44; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Preflight check – server side validation before signing
export const preflightSchema = z.object({
  asset: z.enum(["WAVES", "USDT"]),
  recipient: z.string().min(35).max(35),
  amount: z.string().min(1),
  message: z.string().max(140).optional(),
  sender: z.string().min(35).max(35).optional(),
});

export type PreflightResult = {
  valid: boolean;
  asset: "WAVES" | "USDT";
  recipient: string;
  amount: string;
  fee: string;
  sender: string;
  totalDeduct: string;
  remainingBalance: string;
  warnings: string[];
  errors: string[];
};

export function performPreflight(
  input: { asset: "WAVES" | "USDT"; recipient: string; amount: string; sender: string; message?: string },
  balances: { waves: string; usdt: string }
): PreflightResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const addrCheck = validateWavesAddressStrict(input.recipient);
  if (!addrCheck.valid) errors.push(addrCheck.error!);

  const amountCheck = validateAmount(input.amount, input.asset, balances.waves, input.asset === "WAVES" ? balances.waves : balances.usdt);
  if (!amountCheck.valid) errors.push(amountCheck.error!);

  const fee = ASSET_FEES[input.asset] ?? "0.001";
  const feeNum = Number(fee);
  const amountNum = Number(input.amount);
  const wavesBal = Number(balances.waves);

  let remaining = "0";
  if (input.asset === "WAVES") {
    remaining = (wavesBal - amountNum - feeNum).toFixed(8);
    if (Number(remaining) < 0) errors.push("Недостаточно средств с учётом комиссии");
    if (Number(remaining) < 0.001 && Number(remaining) >= 0) warnings.push("После операции останется менее 0.001 WAVES — может не хватить на следующие транзакции");
  } else {
    const usdtBal = Number(balances.usdt);
    remaining = (usdtBal - amountNum).toFixed(6);
    if (wavesBal < feeNum) errors.push(`Недостаточно WAVES для комиссии: нужно ${fee} WAVES`);
    if (Number(remaining) < 0) errors.push("Недостаточно USDT");
  }

  if (input.recipient === input.sender) errors.push("Нельзя отправить средства самому себе");
  if (input.message && input.message.length > 140) errors.push("Сообщение слишком длинное (макс 140 символов)");

  // Extra warnings
  if (amountNum > 1000) warnings.push("Крупная сумма — проверьте адрес получателя ещё раз");
  if (amountNum < 0.01 && input.asset === "WAVES") warnings.push("Малая сумма WAVES — убедитесь в корректности");

  const totalDeduct = input.asset === "WAVES" ? (amountNum + feeNum).toFixed(8) : amountNum.toFixed(6);

  return {
    valid: errors.length === 0,
    asset: input.asset,
    recipient: input.recipient,
    amount: input.amount,
    fee,
    sender: input.sender,
    totalDeduct,
    remainingBalance: remaining,
    warnings,
    errors,
  };
}

// Challenge / Signature helpers
export function generateChallenge(address?: string): { challenge: string; createdAt: Date; expiresAt: Date } {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min
  // challenge format: cryptobank-<timestamp>-<random>-addressHint
  const random = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  const challenge = `cryptobank:${now.getTime()}:${random}:${address ?? "new"}`;
  return { challenge, createdAt: now, expiresAt };
}

export function verifySignatureMock(challenge: string, signature: string, publicKey: string): boolean {
  // In real implementation, verify ed25519 / curve25519 signature of challenge bytes
  // For mock, accept any non-empty signature with length > 20 and base58-ish, and publicKey length ~44 / 32 bytes base58
  if (!challenge || !signature || !publicKey) return false;
  if (signature.length < 20) return false;
  if (publicKey.length < 30) return false;
  // Must contain challenge substring? Mock passes
  // simulate invalid 10% if signature contains "invalid"
  if (signature.toLowerCase().includes("invalid")) return false;
  return true;
}

export function isChallengeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

// Callback URL validation for deep link
export function validateCallbackUrl(url: string): boolean {
  // Must be cryptobank://wx-callback or https://...
  if (url.startsWith("cryptobank://wx-callback")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
