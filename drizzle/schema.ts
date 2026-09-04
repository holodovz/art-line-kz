import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, index, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Wallet profiles – connected WX.Network / Keeper wallets
export const walletProfiles = mysqlTable("wallet_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  address: varchar("address", { length: 64 }).notNull(),
  publicKey: varchar("publicKey", { length: 128 }),
  wxAddress: varchar("wxAddress", { length: 64 }),
  network: mysqlEnum("network", ["mainnet", "testnet"]).default("mainnet").notNull(),
  status: mysqlEnum("status", ["connected", "disconnected", "expired"]).default("connected").notNull(),
  label: varchar("label", { length: 100 }),
  lastSyncAt: timestamp("lastSyncAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("wallet_user_idx").on(table.userId),
  addressIdx: index("wallet_address_idx").on(table.address),
}));

export type WalletProfile = typeof walletProfiles.$inferSelect;
export type InsertWalletProfile = typeof walletProfiles.$inferInsert;

// Auth challenges for WX.Network Web Auth flow
export const authChallenges = mysqlTable("auth_challenges", {
  id: int("id").autoincrement().primaryKey(),
  challenge: varchar("challenge", { length: 512 }).notNull().unique(),
  userId: int("userId"),
  publicKey: varchar("publicKey", { length: 128 }),
  wxAddress: varchar("wxAddress", { length: 64 }),
  signature: varchar("signature", { length: 512 }),
  redirectUrl: varchar("redirectUrl", { length: 512 }),
  status: mysqlEnum("status", ["pending", "verified", "expired", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
}, (table) => ({
  challengeIdx: index("challenge_idx").on(table.challenge),
}));

export type AuthChallenge = typeof authChallenges.$inferSelect;
export type InsertAuthChallenge = typeof authChallenges.$inferInsert;

// Asset notes – user labels/notes for WAVES/USDT cards
export const assetNotes = mysqlTable("asset_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  assetId: mysqlEnum("assetId", ["WAVES", "USDT"]).notNull(),
  label: varchar("label", { length: 100 }),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userAssetIdx: index("asset_notes_user_asset_idx").on(table.userId, table.assetId),
}));

export type AssetNote = typeof assetNotes.$inferSelect;
export type InsertAssetNote = typeof assetNotes.$inferInsert;

// Transactions journal
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  asset: mysqlEnum("asset", ["WAVES", "USDT"]).notNull(),
  type: mysqlEnum("type", ["send", "receive"]).notNull(),
  amount: varchar("amount", { length: 32 }).notNull(),
  fee: varchar("fee", { length: 32 }).notNull(),
  sender: varchar("sender", { length: 64 }).notNull(),
  recipient: varchar("recipient", { length: 64 }).notNull(),
  txId: varchar("txId", { length: 128 }),
  status: mysqlEnum("status", ["pending", "processing", "success", "failed"]).default("pending").notNull(),
  explorerUrl: varchar("explorerUrl", { length: 512 }),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("tx_user_idx").on(table.userId),
  assetIdx: index("tx_asset_idx").on(table.asset),
  statusIdx: index("tx_status_idx").on(table.status),
}));

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// Notes attached to transactions
export const transactionNotes = mysqlTable("transaction_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  transactionId: int("transactionId").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  txIdx: index("tx_notes_tx_idx").on(table.transactionId),
  userIdx: index("tx_notes_user_idx").on(table.userId),
}));

export type TransactionNote = typeof transactionNotes.$inferSelect;
export type InsertTransactionNote = typeof transactionNotes.$inferInsert;

// Diagnostics events – safe technical data only
export const diagnosticEvents = mysqlTable("diagnostic_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  challenge: varchar("challenge", { length: 512 }),
  signature: varchar("signature", { length: 128 }),
  publicKey: varchar("publicKey", { length: 128 }),
  wxAddress: varchar("wxAddress", { length: 64 }),
  sessionStatus: mysqlEnum("sessionStatus", ["connected", "connecting", "expired", "error", "disconnected"]).default("disconnected").notNull(),
  redirectUrl: varchar("redirectUrl", { length: 512 }),
  ipHint: varchar("ipHint", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
}, (table) => ({
  userIdx: index("diag_user_idx").on(table.userId),
}));

export type DiagnosticEvent = typeof diagnosticEvents.$inferSelect;
export type InsertDiagnosticEvent = typeof diagnosticEvents.$inferInsert;

// Portfolio snapshots – cached balances when Waves Node unavailable
export const portfolioSnapshots = mysqlTable("portfolio_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  address: varchar("address", { length: 64 }).notNull(),
  wavesBalance: varchar("wavesBalance", { length: 32 }).notNull(),
  usdtBalance: varchar("usdtBalance", { length: 32 }).notNull(),
  lastNodeSyncAt: timestamp("lastNodeSyncAt"),
  isStale: boolean("isStale").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("snapshot_user_idx").on(table.userId),
  addrIdx: index("snapshot_addr_idx").on(table.address),
}));

export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type InsertPortfolioSnapshot = typeof portfolioSnapshots.$inferInsert;
