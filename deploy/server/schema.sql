-- ParamisTech — PostgreSQL schema. Idempotent: safe to run on every deploy.
-- Table/column names mirror the app's data model so endpoint SQL runs unchanged.
SET client_min_messages = warning;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "ProjectRequests" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fullName" text, "phone" text, "email" text, "company" text,
  "projectType" text, "budget" text, "timeline" text, "details" text,
  "estimatedCost" numeric, "status" text DEFAULT 'جدید',
  "submittedAt" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "Admins" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "username" text, "displayName" text, "passwordHash" text,
  "role" text DEFAULT 'مدیر کل', "active" boolean DEFAULT true,
  "lastLoginAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admins_username_uq ON "Admins" (lower("username"));
CREATE TABLE IF NOT EXISTS "Customers" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" text, "contactName" text, "email" text, "phone" text, "nationalId" text,
  "address" text, "notes" text, "active" boolean DEFAULT true,
  "username" text, "passwordHash" text, "lastLoginAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_username_uq ON "Customers" (lower("username")) WHERE "username" IS NOT NULL AND "username" <> '';
CREATE TABLE IF NOT EXISTS "Services" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text, "customer" text[] DEFAULT '{}', "kind" text, "domain" text,
  "amount" numeric, "billingPeriod" text, "startDate" date, "nextDueDate" date,
  "autoRenew" boolean DEFAULT true, "status" text DEFAULT 'فعال', "notes" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "Invoices" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "number" text, "customer" text[] DEFAULT '{}', "service" text[] DEFAULT '{}',
  "issueDate" date, "dueDate" date, "status" text, "items" text,
  "discount" numeric, "total" numeric, "periodLabel" text, "notes" text,
  "paidAt" timestamptz, "remindersSent" numeric DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "Payments" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "trackingCode" text, "invoice" text[] DEFAULT '{}', "customer" text[] DEFAULT '{}',
  "amount" numeric, "paidDate" date, "receipt" jsonb DEFAULT '[]'::jsonb,
  "payerCard" text, "status" text DEFAULT 'در انتظار بررسی', "reviewNote" text, "reviewedBy" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "BankAccounts" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text, "holderName" text, "cardNumber" text, "sheba" text, "bankName" text,
  "active" boolean DEFAULT true, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "Notifications" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text, "body" text, "audience" text, "customer" text[] DEFAULT '{}',
  "link" text, "read" boolean DEFAULT false, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "key" text, "value" text, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sitesettings_key_uq ON "SiteSettings" ("key");
CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "action" text, "actor" text, "details" text, "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "ContentItems" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title" text, "kind" text, "subtitle" text, "body" text, "image" text, "link" text, "tags" text,
  "sortOrder" numeric DEFAULT 0, "visible" boolean DEFAULT true, "category" text,
  "projectStatus" text, "featured" boolean DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS services_customer_gin ON "Services" USING gin ("customer");
CREATE INDEX IF NOT EXISTS invoices_customer_gin ON "Invoices" USING gin ("customer");
CREATE INDEX IF NOT EXISTS invoices_service_gin ON "Invoices" USING gin ("service");
CREATE INDEX IF NOT EXISTS invoices_status_idx ON "Invoices" ("status");
CREATE INDEX IF NOT EXISTS payments_invoice_gin ON "Payments" USING gin ("invoice");
CREATE INDEX IF NOT EXISTS payments_customer_gin ON "Payments" USING gin ("customer");
CREATE INDEX IF NOT EXISTS notifications_customer_gin ON "Notifications" USING gin ("customer");
CREATE INDEX IF NOT EXISTS content_kind_idx ON "ContentItems" ("kind", "visible");
CREATE INDEX IF NOT EXISTS activity_created_idx ON "ActivityLog" ("createdAt" DESC);

-- Link table used by dashboard SQL (Customers <-> Services)
CREATE OR REPLACE VIEW "CustomersServices" AS
  SELECT c AS "customersId", s."id" AS "servicesId" FROM "Services" s, unnest(s."customer") AS c;
