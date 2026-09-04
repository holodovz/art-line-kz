import { describe, it, expect } from "vitest";
import {
  isValidWavesAddress,
  validateWavesAddressStrict,
  validateAmount,
  performPreflight,
  generateChallenge,
  verifySignatureMock,
  isChallengeExpired,
  validateCallbackUrl,
  getExplorerUrl,
} from "../server/crypto/waves";

describe("Waves address validation", () => {
  it("validates correct mainnet address", () => {
    expect(validateWavesAddressStrict("3P8p1AQHqRQ9y2JpWq6rTtN9fKx7YhZb2vQ")).toEqual({ valid: true });
    expect(isValidWavesAddress("3P8p1AQHqRQ9y2JpWq6rTtN9fKx7YhZb2vQ", "mainnet")).toBe(true);
  });
  it("rejects wrong length", () => {
    expect(validateWavesAddressStrict("3Pshort")).toEqual({ valid: false, error: expect.any(String) });
  });
  it("rejects invalid base58 chars (0,O,I,l)", () => {
    expect(validateWavesAddressStrict("3P0OIl11111111111111111111111111111")).toHaveProperty("valid", false);
  });
  it("requires 3P/3N prefix", () => {
    expect(validateWavesAddressStrict("1P8p1AQHqRQ9y2JpWq6rTtN9fKx7YhZb2vQ")).toHaveProperty("valid", false);
  });
  it("accepts 3N testnet", () => {
    expect(validateWavesAddressStrict("3N8p1AQHqRQ9y2JpWq6rTtN9fKx7YhZb2vQ")).toEqual({ valid: true });
  });
});

describe("Amount validation", () => {
  it("valid amount WAVES 8 decimals", () => {
    expect(validateAmount("1.12345678", "WAVES", "10", "10")).toEqual({ valid: true });
  });
  it("rejects too many decimals WAVES", () => {
    expect(validateAmount("1.123456789", "WAVES")).toHaveProperty("valid", false);
  });
  it("rejects too many decimals USDT 6", () => {
    expect(validateAmount("1.1234567", "USDT")).toHaveProperty("valid", false);
  });
  it("rejects insufficient funds", () => {
    expect(validateAmount("100", "WAVES", "10", "10")).toHaveProperty("valid", false);
  });
  it("requires WAVES for USDT fee", () => {
    expect(validateAmount("10", "USDT", "0.0001", "100")).toHaveProperty("valid", false);
  });
  it("rejects zero/negative", () => {
    expect(validateAmount("0", "WAVES")).toHaveProperty("valid", false);
    expect(validateAmount("-1", "USDT")).toHaveProperty("valid", false);
  });
});

describe("Commission and preflight", () => {
  const balances = { waves: "10.00000000", usdt: "1000.000000" };
  const sender = "3PA11111111111111111111111111111111";
  const recipient = "3PB22222222222222222222222222222222";

  it("valid WAVES preflight", () => {
    const r = performPreflight({ asset: "WAVES", recipient, amount: "1.5", sender }, balances);
    expect(r.valid).toBe(true);
    expect(r.fee).toBe("0.001");
    expect(r.remainingBalance).toBe((10 - 1.5 - 0.001).toFixed(8));
  });
  it("valid USDT preflight", () => {
    const r = performPreflight({ asset: "USDT", recipient, amount: "100", sender }, balances);
    expect(r.valid).toBe(true);
  });
  it("detects self-transfer", () => {
    const r = performPreflight({ asset: "WAVES", recipient: sender, amount: "1", sender }, balances);
    expect(r.valid).toBe(false);
    expect(r.errors.join()).toMatch(/самому себе/);
  });
  it("detects insufficient WAVES with fee", () => {
    const r = performPreflight({ asset: "WAVES", recipient, amount: "10", sender }, balances);
    expect(r.valid).toBe(false);
  });
  it("warns on large amount", () => {
    const r = performPreflight({ asset: "USDT", recipient, amount: "1500", sender }, { waves: "10", usdt: "5000" });
    expect(r.warnings.length).toBeGreaterThan(0);
  });
  it("fee is always 0.001", () => {
    const r1 = performPreflight({ asset: "WAVES", recipient, amount: "1", sender }, balances);
    const r2 = performPreflight({ asset: "USDT", recipient, amount: "1", sender }, balances);
    expect(r1.fee).toBe("0.001");
    expect(r2.fee).toBe("0.001");
  });
});

describe("Challenge / signature flow", () => {
  it("generates challenge with expiry 5min", () => {
    const { challenge, expiresAt, createdAt } = generateChallenge("3Ptest");
    expect(challenge).toMatch(/^cryptobank:/);
    expect(challenge).toContain("3Ptest");
    expect(expiresAt.getTime() - createdAt.getTime()).toBe(5 * 60 * 1000);
  });
  it("detects expired challenge", () => {
    const past = new Date(Date.now() - 10000);
    expect(isChallengeExpired(past)).toBe(true);
    const future = new Date(Date.now() + 60000);
    expect(isChallengeExpired(future)).toBe(false);
  });
  it("verifies mock signature", () => {
    const ch = "cryptobank:123:abc:test";
    expect(verifySignatureMock(ch, "validSignatureBase58MockLongEnough12345", "validPublicKeyBase58MockLongEnough1234567890")).toBe(true);
    expect(verifySignatureMock(ch, "short", "short")).toBe(false);
    expect(verifySignatureMock(ch, "invalid_signature_contains_invalid", "validPublicKeyBase58MockLongEnough1234567890")).toBe(false);
  });
  it("generates unique challenges", () => {
    const a = generateChallenge().challenge;
    const b = generateChallenge().challenge;
    expect(a).not.toBe(b);
  });
});

describe("Callback URL", () => {
  it("allows cryptobank scheme", () => {
    expect(validateCallbackUrl("cryptobank://wx-callback?challenge=abc")).toBe(true);
    expect(validateCallbackUrl("cryptobank://wx-callback")).toBe(true);
  });
  it("allows https", () => {
    expect(validateCallbackUrl("https://example.com/callback")).toBe(true);
  });
  it("rejects invalid", () => {
    expect(validateCallbackUrl("not-a-url")).toBe(false);
    expect(validateCallbackUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("Explorer URL", () => {
  it("generates correct explorer link", () => {
    expect(getExplorerUrl("abc123")).toBe("https://wavesexplorer.com/tx/abc123");
    expect(getExplorerUrl("abc123", "testnet")).toBe("https://testnet.wavesexplorer.com/tx/abc123");
  });
});
