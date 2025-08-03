// Define user groups as a PostgreSQL enum
export const UserGroup = {
  ADMIN: 'admin',                    // Full system access
  SECOND_RANK_ADMIN: 'second_admin', // All admin features except employee management
  KYC_EMPLOYEE: 'kyc_employee',      // KYC verification specialist
  FINANCE_EMPLOYEE: 'finance_emp',    // Financial operations
  VIEWONLY_EMPLOYEE: 'view_emp',     // Read-only access
  CLIENT: 'client',                  // Regular client
} as const;

import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Users table definition with updated balance type and 2FA fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  full_name: text("full_name"),
  address: text("address"),
  phone_number: text("phone_number"),
  country_of_residence: text("country_of_residence"),
  gender: text("gender"),
  email: text("email"),
  email_verified: boolean("email_verified").default(false),
  kyc_status: text("kyc_status").default('pending'),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0"),
  balance_currency: text("balance_currency").default("EUR"),
  is_admin: boolean("is_admin").default(false),
  is_employee: boolean("is_employee").default(false),
  user_group: text("user_group").default('client'),
  commission_fee: decimal("commission_fee", { precision: 5, scale: 2 }).default("10.00"), // Changed from 16.00 to 10.00
  profile_updated: boolean("profile_updated").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  last_login_at: timestamp("last_login_at"),
  status: text("status").default('active'),
  // Referral related fields
  referral_code: text("referral_code").unique().default(''), // Contractor's referral code
  referred_by: text("referred_by"), // Referral code used when registering
  is_contractor: boolean("is_contractor").default(false), // Whether user is a contractor with a referral code
  contractor_id: integer("contractor_id"), // The ID of the contractor who referred this user
  contractor_commission_rate: decimal("contractor_commission_rate", { precision: 5, scale: 2 }).default("0.85"), // Contractor commission rate (0.85%)
  // 2FA related fields
  two_factor_enabled: boolean("two_factor_enabled").default(false),
  two_factor_verified: boolean("two_factor_verified").default(false),
  two_factor_secret: text("two_factor_secret"),
  two_factor_backup_codes: jsonb("two_factor_backup_codes"),
  two_factor_method: text("two_factor_method").default('authenticator')
});

// Export schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// Export types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

// Define permission types
export const PermissionType = {
  VIEW_CLIENT_INFO: 'view_client_info',
  EDIT_CLIENT_INFO: 'edit_client_info',
  VIEW_TRANSACTIONS: 'view_transactions',
  EDIT_TRANSACTIONS: 'edit_transactions',
  VIEW_KYC: 'view_kyc',
  EDIT_KYC: 'edit_kyc',
  VIEW_BALANCES: 'view_balances',
  EDIT_BALANCES: 'edit_balances',
  MANAGE_EMPLOYEES: 'manage_employees',
} as const;

export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  permission_type: text("permission_type").notNull(),
  granted: boolean("granted").default(false),
  granted_by: integer("granted_by").references(() => users.id),
  granted_at: timestamp("granted_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const kycDocuments = pgTable("kyc_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  documentType: text("document_type").notNull(),
  documentUrl: text("document_url").notNull(),
  driveFileId: text("drive_file_id").notNull(),
  driveViewLink: text("drive_view_link").notNull(),
  fileName: text("file_name").notNull(),
  status: text("status").default('pending'),
  adminComment: text("admin_comment"),
  reviewedAt: timestamp("reviewed_at"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  metadata: jsonb("metadata")
});

export const sepaDeposits = pgTable("sepa_deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  reference: text("reference").notNull(),
  status: text("status").default('pending'),
  commissionFee: decimal("commission_fee", { precision: 10, scale: 2 }).notNull(), // Platform commission fee
  referralCode: text("referral_code"), // Tracks which referral code was used
  contractorId: integer("contractor_id").references(() => users.id), // References the contractor user who referred
  contractorCommission: decimal("contractor_commission", { precision: 10, scale: 2 }), // Amount of commission for contractor
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const usdtOrders = pgTable("usdt_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }).notNull(),
  amountUsdt: decimal("amount_usdt", { precision: 10, scale: 2 }).notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).notNull(),
  usdtAddress: text("usdt_address").notNull(),
  network: text("network").default('TRC20'),
  status: text("status").default('processing'),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(),
  messageContent: text("message_content").notNull(),
  messageType: text("message_type").notNull(), // 'user' or 'bot'
  metadata: jsonb("metadata"), // Store additional context like clicks, page location, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  code: text("code").notNull(),
  type: text("type").notNull(), // 'email_verification' or 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usdcOrders = pgTable("usdc_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amountUsd: decimal("amount_usd", { precision: 10, scale: 2 }).notNull(),
  amountUsdc: decimal("amount_usdc", { precision: 10, scale: 2 }).notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }).notNull(),
  usdcAddress: text("usdc_address").notNull(),
  network: text("network").default('Solana'),
  status: text("status").default('processing'),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Profile update requests table to store pending user profile changes
export const profileUpdateRequests = pgTable("profile_update_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  fullName: text("full_name"),
  email: text("email"),
  phoneNumber: text("phone_number"),
  address: text("address"),
  countryOfResidence: text("country_of_residence"),
  gender: text("gender"),
  status: text("status").default('pending').notNull(), // pending, approved, rejected
  adminComment: text("admin_comment"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at")
});

export const usersRelations = relations(users, ({ many }) => ({
  kycDocuments: many(kycDocuments),
  sepaDeposits: many(sepaDeposits, { relationName: "user" }), // Specify that this is the "user" relation in sepaDeposits
  contractorDeposits: many(sepaDeposits, { relationName: "contractor" }), // Add the contractor deposits relation
  usdtOrders: many(usdtOrders),
  usdcOrders: many(usdcOrders), // Add USDC orders relation
  chatHistory: many(chatHistory),
  permissions: many(userPermissions),
  verificationCodes: many(verificationCodes),
  profileUpdateRequests: many(profileUpdateRequests), // Add profile update requests relation
}));

export const kycDocumentsRelations = relations(kycDocuments, ({ one }) => ({
  user: one(users, {
    fields: [kycDocuments.userId],
    references: [users.id],
  }),
}));

export const sepaDepositsRelations = relations(sepaDeposits, ({ one }) => ({
  user: one(users, {
    fields: [sepaDeposits.userId],
    references: [users.id],
  }),
  contractor: one(users, {
    fields: [sepaDeposits.contractorId],
    references: [users.id],
  }),
}));

export const usdtOrdersRelations = relations(usdtOrders, ({ one }) => ({
  user: one(users, {
    fields: [usdtOrders.userId],
    references: [users.id],
  }),
}));

export const chatHistoryRelations = relations(chatHistory, ({ one }) => ({
  user: one(users, {
    fields: [chatHistory.userId],
    references: [users.id],
  }),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.user_id],
    references: [users.id],
  }),
  grantedByUser: one(users, {
    fields: [userPermissions.granted_by],
    references: [users.id],
  }),
}));

export const verificationCodesRelations = relations(verificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [verificationCodes.userId],
    references: [users.id],
  }),
}));

export const usdcOrdersRelations = relations(usdcOrders, ({ one }) => ({
  user: one(users, {
    fields: [usdcOrders.userId],
    references: [users.id],
  }),
}));

export const insertKycDocumentSchema = createInsertSchema(kycDocuments);
export const selectKycDocumentSchema = createSelectSchema(kycDocuments);
export const insertSepaDepositSchema = createInsertSchema(sepaDeposits);
export const selectSepaDepositSchema = createSelectSchema(sepaDeposits);
export const insertUsdtOrderSchema = createInsertSchema(usdtOrders);
export const selectUsdtOrderSchema = createSelectSchema(usdtOrders);
export const insertChatHistorySchema = createInsertSchema(chatHistory);
export const selectChatHistorySchema = createSelectSchema(chatHistory);
export const insertUserPermissionSchema = createInsertSchema(userPermissions);
export const selectUserPermissionSchema = createSelectSchema(userPermissions);
export const insertVerificationCodeSchema = createInsertSchema(verificationCodes);
export const selectVerificationCodeSchema = createSelectSchema(verificationCodes);
export const insertUsdcOrderSchema = createInsertSchema(usdcOrders);
export const selectUsdcOrderSchema = createSelectSchema(usdcOrders);

export type InsertKycDocument = typeof kycDocuments.$inferInsert;
export type SelectKycDocument = typeof kycDocuments.$inferSelect;
export type InsertSepaDeposit = typeof sepaDeposits.$inferInsert;
export type SelectSepaDeposit = typeof sepaDeposits.$inferSelect;
export type InsertUsdtOrder = typeof usdtOrders.$inferInsert;
export type SelectUsdtOrder = typeof usdtOrders.$inferSelect;
export type InsertChatHistory = typeof chatHistory.$inferInsert;
export type SelectChatHistory = typeof chatHistory.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;
export type SelectUserPermission = typeof userPermissions.$inferSelect;
export type InsertVerificationCode = typeof verificationCodes.$inferInsert;
export type SelectVerificationCode = typeof verificationCodes.$inferSelect;
export type InsertUsdcOrder = typeof usdcOrders.$inferInsert;
export type SelectUsdcOrder = typeof usdcOrders.$inferSelect;

// Now add profile update requests related schemas and types
export const profileUpdateRequestsRelations = relations(profileUpdateRequests, ({ one }) => ({
  user: one(users, {
    fields: [profileUpdateRequests.userId],
    references: [users.id]
  }),
  reviewer: one(users, {
    fields: [profileUpdateRequests.reviewedBy],
    references: [users.id]
  })
}));

// Create schemas for validation
export const insertProfileUpdateRequestSchema = createInsertSchema(profileUpdateRequests);
export const selectProfileUpdateRequestSchema = createSelectSchema(profileUpdateRequests);

// Export types
export type InsertProfileUpdateRequest = typeof profileUpdateRequests.$inferInsert;
export type SelectProfileUpdateRequest = typeof profileUpdateRequests.$inferSelect;

// User sessions table for device management
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  session_id: varchar("session_id", { length: 128 }).notNull().unique(),
  user_id: integer("user_id").notNull().references(() => users.id),
  ip_address: varchar("ip_address", { length: 50 }),
  user_agent: text("user_agent"),
  device_info: text("device_info"),
  device_name: varchar("device_name", { length: 100 }),
  device_type: varchar("device_type", { length: 20 }).default('other'),
  device_id: varchar("device_id", { length: 255 }),
  device_os: varchar("device_os", { length: 20 }),
  push_token: text("push_token"),
  notifications_enabled: boolean("notifications_enabled").default(true),
  last_activity: timestamp("last_activity").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
  expires_at: timestamp("expires_at"),
  metadata: jsonb("metadata")
});

// Relation between users and sessions
export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.user_id],
    references: [users.id],
  }),
}));

// Add sessions to user relations
export const usersSessionsRelation = relations(users, ({ many }) => ({
  sessions: many(userSessions)
}));

// Create schemas for validation
export const insertUserSessionSchema = createInsertSchema(userSessions);
export const selectUserSessionSchema = createSelectSchema(userSessions);

// Export types
export type InsertUserSession = typeof userSessions.$inferInsert;
export type SelectUserSession = typeof userSessions.$inferSelect;