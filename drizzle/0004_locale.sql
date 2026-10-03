ALTER TABLE "faqs" ADD COLUMN "question_en" varchar(300);--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "answer_en" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "locale" varchar(5) DEFAULT 'fa' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "title_en" varchar(200);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "excerpt_en" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "body_md_en" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "title_en" varchar(200);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "summary_en" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "challenge_md_en" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "solution_md_en" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "results_md_en" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "slug_en" varchar(160);--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "title_en" varchar(200);--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "short_description_en" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "body_md_en" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "contact_address_en" varchar(300) DEFAULT '';--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_slug_en_unique" UNIQUE("slug_en");