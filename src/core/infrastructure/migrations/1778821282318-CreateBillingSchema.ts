import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBillingSchema1778821282318 implements MigrationInterface {
    name = 'CreateBillingSchema1778821282318'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "billing"`);
        await queryRunner.query(`CREATE TABLE "billing"."pricing_plans" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "tier" character varying(20) NOT NULL, "billing_cycle" character varying(20) NOT NULL, "currency" character(3) NOT NULL, "amount" numeric(10,2) NOT NULL, "trial_days" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, "effective_from" TIMESTAMP WITH TIME ZONE NOT NULL, "effective_until" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, CONSTRAINT "UQ_e1d3c2c8268dc3b40ec1200f263" UNIQUE ("uuid"), CONSTRAINT "UQ_2f3451383f528d19e9d185b9270" UNIQUE ("tier", "billing_cycle", "currency", "effective_from"), CONSTRAINT "PK_57aa9837d4777aafc70ba090fb6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_19d64c2e7e8696c08ae1ce3da6" ON "billing"."pricing_plans" ("tier", "billing_cycle", "currency", "is_active") `);
        await queryRunner.query(`CREATE TABLE "billing"."payment_providers" ("code" character varying(20) NOT NULL, "name" character varying(100) NOT NULL, "is_enabled" boolean NOT NULL DEFAULT true, "api_version" character varying(50), "default_currency" character(3), "webhook_endpoint_path" character varying(200), "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3b92bdeea5c610e84052154ef25" PRIMARY KEY ("code"))`);
        await queryRunner.query(`CREATE TABLE "billing"."subscriptions" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "tenant_uuid" uuid NOT NULL, "pricing_plan_id" integer, "provider_code" character varying(20), "external_customer_id" character varying(100), "external_subscription_id" character varying(100), "status" character varying(30) NOT NULL, "current_period_start" TIMESTAMP WITH TIME ZONE, "current_period_end" TIMESTAMP WITH TIME ZONE, "cancel_at_period_end" boolean NOT NULL DEFAULT false, "trial_ends_at" TIMESTAMP WITH TIME ZONE, "grace_period_ends_at" TIMESTAMP WITH TIME ZONE, "metadata" jsonb, CONSTRAINT "UQ_eb660c4a66c2c5d344553401002" UNIQUE ("uuid"), CONSTRAINT "UQ_66b296b84267f953a1032b5160a" UNIQUE ("tenant_uuid"), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_subscriptions_tenant" ON "billing"."subscriptions" ("tenant_uuid") `);
        await queryRunner.query(`CREATE INDEX "idx_subscriptions_status_grace" ON "billing"."subscriptions" ("status", "grace_period_ends_at") `);
        await queryRunner.query(`CREATE INDEX "idx_subscriptions_external_sub" ON "billing"."subscriptions" ("provider_code", "external_subscription_id") `);
        await queryRunner.query(`CREATE INDEX "idx_subscriptions_external_customer" ON "billing"."subscriptions" ("provider_code", "external_customer_id") `);
        await queryRunner.query(`CREATE TABLE "billing"."subscription_events" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "subscription_id" integer NOT NULL, "tenant_uuid" uuid NOT NULL, "event_type" character varying(60) NOT NULL, "actor_type" character varying(20) NOT NULL, "actor_id" character varying(100), "related_entity_type" character varying(30), "related_entity_id" integer, "description" text, "payload" jsonb, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_f8b69cfe171de40a56c1601d03b" UNIQUE ("uuid"), CONSTRAINT "PK_7eb5647aa3071cffad0124bceee" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_sub_events_type_occurred" ON "billing"."subscription_events" ("event_type", "occurred_at") `);
        await queryRunner.query(`CREATE INDEX "idx_sub_events_tenant_occurred" ON "billing"."subscription_events" ("tenant_uuid", "occurred_at") `);
        await queryRunner.query(`CREATE INDEX "idx_sub_events_subscription_occurred" ON "billing"."subscription_events" ("subscription_id", "occurred_at") `);
        await queryRunner.query(`CREATE TABLE "billing"."subscription_changes" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "subscription_id" integer NOT NULL, "from_pricing_plan_id" integer, "to_pricing_plan_id" integer NOT NULL, "change_type" character varying(20) NOT NULL, "source" character varying(20) NOT NULL, "state" character varying(20) NOT NULL, "requested_at" TIMESTAMP WITH TIME ZONE NOT NULL, "effective_at" TIMESTAMP WITH TIME ZONE, "grace_period_ends_at" TIMESTAMP WITH TIME ZONE, "auto_archived_at" TIMESTAMP WITH TIME ZONE, "pre_deletion_notice_at" TIMESTAMP WITH TIME ZONE, "deleted_at" TIMESTAMP WITH TIME ZONE, "reverted_at" TIMESTAMP WITH TIME ZONE, "revert_reason" character varying(100), "prorated_amount" numeric(10,2), "archive_snapshot" jsonb, CONSTRAINT "UQ_bcb0e9039c24f57c2866471333c" UNIQUE ("uuid"), CONSTRAINT "PK_2fb5544fa5ee64a8f11ba29746f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_sub_changes_subscription" ON "billing"."subscription_changes" ("subscription_id") `);
        await queryRunner.query(`CREATE INDEX "idx_sub_changes_state_grace" ON "billing"."subscription_changes" ("state", "grace_period_ends_at") `);
        await queryRunner.query(`CREATE INDEX "idx_sub_changes_state_effective" ON "billing"."subscription_changes" ("state", "effective_at") `);
        await queryRunner.query(`CREATE TABLE "billing"."provider_price_mappings" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "pricing_plan_id" integer NOT NULL, "provider_code" character varying(20) NOT NULL, "external_product_id" character varying(100) NOT NULL, "external_price_id" character varying(100) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_60b01eaa9c66d609907b1b45bf1" UNIQUE ("uuid"), CONSTRAINT "uq_mapping_external_price" UNIQUE ("provider_code", "external_price_id"), CONSTRAINT "PK_b6de16277955e7278c2c4fc1c28" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bf405ea9c83df6457699adaa5f" ON "billing"."provider_price_mappings" ("pricing_plan_id", "provider_code", "is_active") `);
        await queryRunner.query(`CREATE TABLE "billing"."payment_provider_events" ("id" SERIAL NOT NULL, "provider_code" character varying(20) NOT NULL, "external_event_id" character varying(100) NOT NULL, "event_type" character varying(50) NOT NULL, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE, "status" character varying(20) NOT NULL, "error_message" text, "payload" jsonb NOT NULL, CONSTRAINT "uq_provider_event_external" UNIQUE ("provider_code", "external_event_id"), CONSTRAINT "PK_e94b23836002f2a07a3046ed2e4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_provider_events_type_received" ON "billing"."payment_provider_events" ("provider_code", "event_type", "received_at") `);
        await queryRunner.query(`CREATE TABLE "billing"."invoices" ("id" SERIAL NOT NULL, "uuid" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "archived_at" TIMESTAMP WITH TIME ZONE, "subscription_id" integer NOT NULL, "tenant_uuid" uuid NOT NULL, "provider_code" character varying(20) NOT NULL, "external_invoice_id" character varying(100) NOT NULL, "amount" numeric(10,2) NOT NULL, "currency" character(3) NOT NULL, "status" character varying(20) NOT NULL, "period_start" TIMESTAMP WITH TIME ZONE NOT NULL, "period_end" TIMESTAMP WITH TIME ZONE NOT NULL, "paid_at" TIMESTAMP WITH TIME ZONE, "attempt_count" integer NOT NULL DEFAULT '0', "metadata" jsonb, CONSTRAINT "UQ_483267a3e3c18647d66c7ab2134" UNIQUE ("uuid"), CONSTRAINT "uq_invoice_external" UNIQUE ("provider_code", "external_invoice_id"), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_invoices_subscription" ON "billing"."invoices" ("subscription_id") `);
        await queryRunner.query(`CREATE INDEX "idx_invoices_tenant" ON "billing"."invoices" ("tenant_uuid") `);
        await queryRunner.query(`ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "FK_14379a39f47f93d487ae2efd28e" FOREIGN KEY ("pricing_plan_id") REFERENCES "billing"."pricing_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing"."subscriptions" ADD CONSTRAINT "FK_d7a14ea3b50c7309a2158be2d50" FOREIGN KEY ("provider_code") REFERENCES "billing"."payment_providers"("code") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing"."subscription_events" ADD CONSTRAINT "FK_485cf051a532ff3a47059d440da" FOREIGN KEY ("subscription_id") REFERENCES "billing"."subscriptions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing"."subscription_changes" ADD CONSTRAINT "FK_1c4dda5448fa138e42bb8bff0ba" FOREIGN KEY ("subscription_id") REFERENCES "billing"."subscriptions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing"."subscription_changes" ADD CONSTRAINT "FK_00ebe7f0a410830bff7dcd5983f" FOREIGN KEY ("from_pricing_plan_id") REFERENCES "billing"."pricing_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing"."subscription_changes" ADD CONSTRAINT "FK_168cea25c7111430a9041d66969" FOREIGN KEY ("to_pricing_plan_id") REFERENCES "billing"."pricing_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing"."provider_price_mappings" ADD CONSTRAINT "FK_64a3fb8b69acd6ae4b765121e2d" FOREIGN KEY ("pricing_plan_id") REFERENCES "billing"."pricing_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing"."provider_price_mappings" ADD CONSTRAINT "FK_cc086c9b0db6a4c9382dbbe07d2" FOREIGN KEY ("provider_code") REFERENCES "billing"."payment_providers"("code") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing"."payment_provider_events" ADD CONSTRAINT "FK_f4c1b50c2a5f676ddd0d386cc46" FOREIGN KEY ("provider_code") REFERENCES "billing"."payment_providers"("code") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" ADD CONSTRAINT "FK_5152c0aa0f851d9b95972b442e0" FOREIGN KEY ("subscription_id") REFERENCES "billing"."subscriptions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" ADD CONSTRAINT "FK_a2e238b2d4aabd7fec7d80a60ad" FOREIGN KEY ("provider_code") REFERENCES "billing"."payment_providers"("code") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "billing"."invoices" DROP CONSTRAINT "FK_a2e238b2d4aabd7fec7d80a60ad"`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" DROP CONSTRAINT "FK_5152c0aa0f851d9b95972b442e0"`);
        await queryRunner.query(`ALTER TABLE "billing"."payment_provider_events" DROP CONSTRAINT "FK_f4c1b50c2a5f676ddd0d386cc46"`);
        await queryRunner.query(`ALTER TABLE "billing"."provider_price_mappings" DROP CONSTRAINT "FK_cc086c9b0db6a4c9382dbbe07d2"`);
        await queryRunner.query(`ALTER TABLE "billing"."provider_price_mappings" DROP CONSTRAINT "FK_64a3fb8b69acd6ae4b765121e2d"`);
        await queryRunner.query(`ALTER TABLE "billing"."subscription_changes" DROP CONSTRAINT "FK_168cea25c7111430a9041d66969"`);
        await queryRunner.query(`ALTER TABLE "billing"."subscription_changes" DROP CONSTRAINT "FK_00ebe7f0a410830bff7dcd5983f"`);
        await queryRunner.query(`ALTER TABLE "billing"."subscription_changes" DROP CONSTRAINT "FK_1c4dda5448fa138e42bb8bff0ba"`);
        await queryRunner.query(`ALTER TABLE "billing"."subscription_events" DROP CONSTRAINT "FK_485cf051a532ff3a47059d440da"`);
        await queryRunner.query(`ALTER TABLE "billing"."subscriptions" DROP CONSTRAINT "FK_d7a14ea3b50c7309a2158be2d50"`);
        await queryRunner.query(`ALTER TABLE "billing"."subscriptions" DROP CONSTRAINT "FK_14379a39f47f93d487ae2efd28e"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_invoices_tenant"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_invoices_subscription"`);
        await queryRunner.query(`DROP TABLE "billing"."invoices"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_provider_events_type_received"`);
        await queryRunner.query(`DROP TABLE "billing"."payment_provider_events"`);
        await queryRunner.query(`DROP INDEX "billing"."IDX_bf405ea9c83df6457699adaa5f"`);
        await queryRunner.query(`DROP TABLE "billing"."provider_price_mappings"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_sub_changes_state_effective"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_sub_changes_state_grace"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_sub_changes_subscription"`);
        await queryRunner.query(`DROP TABLE "billing"."subscription_changes"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_sub_events_subscription_occurred"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_sub_events_tenant_occurred"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_sub_events_type_occurred"`);
        await queryRunner.query(`DROP TABLE "billing"."subscription_events"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_subscriptions_external_customer"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_subscriptions_external_sub"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_subscriptions_status_grace"`);
        await queryRunner.query(`DROP INDEX "billing"."idx_subscriptions_tenant"`);
        await queryRunner.query(`DROP TABLE "billing"."subscriptions"`);
        await queryRunner.query(`DROP TABLE "billing"."payment_providers"`);
        await queryRunner.query(`DROP INDEX "billing"."IDX_19d64c2e7e8696c08ae1ce3da6"`);
        await queryRunner.query(`DROP TABLE "billing"."pricing_plans"`);
        await queryRunner.query(`DROP SCHEMA IF EXISTS "billing" CASCADE`);
    }

}
