ALTER TABLE "posts" ADD COLUMN "slug_en" varchar(160);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "meta_title_en" varchar(200);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "meta_description_en" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "slug_en" varchar(160);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "category_en" varchar(80);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "meta_title_en" varchar(200);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "meta_description_en" text;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "meta_title_en" varchar(200);--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "meta_description_en" text;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_slug_en_unique" UNIQUE("slug_en");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_slug_en_unique" UNIQUE("slug_en");