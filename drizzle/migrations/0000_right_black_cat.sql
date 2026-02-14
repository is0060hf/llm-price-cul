CREATE TABLE "embedding_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name" text NOT NULL,
	"input_price_per_m_tokens" real NOT NULL,
	"dimensions" integer,
	"pricing_tier" text DEFAULT 'online' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"input_price_per_m_tokens" real NOT NULL,
	"output_price_per_m_tokens" real NOT NULL,
	"cache_write_price_per_m_tokens" real,
	"cache_read_price_per_m_tokens" real,
	"max_context_length" integer,
	"is_legacy" boolean DEFAULT false NOT NULL,
	"benchmark_gpqa" real,
	"benchmark_swe_bench" real,
	"benchmark_aime" real,
	"benchmark_arc_agi" real,
	"benchmark_mmmu" real,
	"benchmark_overall" real,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "providers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "web_search_tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name" text NOT NULL,
	"price_per_1k_calls" real NOT NULL,
	"additional_pricing_notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "embedding_models" ADD CONSTRAINT "embedding_models_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_search_tools" ADD CONSTRAINT "web_search_tools_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;