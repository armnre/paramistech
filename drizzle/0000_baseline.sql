CREATE TABLE IF NOT EXISTS "admin_login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_type" varchar(100) NOT NULL,
	"budget" varchar(100) NOT NULL,
	"timeline" varchar(100) NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"details" text NOT NULL,
	"consent" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_attempts_ip_created_idx" ON "admin_login_attempts" USING btree ("ip_hash","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_attempts_ip_created_idx" ON "lead_attempts" USING btree ("ip_hash","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads" USING btree ("created_at");
