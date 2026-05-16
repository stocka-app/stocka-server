import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeInvoiceProviderCodeNullable1778890501834 implements MigrationInterface {
    name = 'MakeInvoiceProviderCodeNullable1778890501834'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "billing"."invoices" DROP CONSTRAINT "FK_a2e238b2d4aabd7fec7d80a60ad"`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" DROP CONSTRAINT "uq_invoice_external"`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" ALTER COLUMN "provider_code" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" ADD CONSTRAINT "uq_invoice_external" UNIQUE ("provider_code", "external_invoice_id")`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" ADD CONSTRAINT "FK_a2e238b2d4aabd7fec7d80a60ad" FOREIGN KEY ("provider_code") REFERENCES "billing"."payment_providers"("code") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "billing"."invoices" DROP CONSTRAINT "FK_a2e238b2d4aabd7fec7d80a60ad"`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" DROP CONSTRAINT "uq_invoice_external"`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" ALTER COLUMN "provider_code" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" ADD CONSTRAINT "uq_invoice_external" UNIQUE ("provider_code", "external_invoice_id")`);
        await queryRunner.query(`ALTER TABLE "billing"."invoices" ADD CONSTRAINT "FK_a2e238b2d4aabd7fec7d80a60ad" FOREIGN KEY ("provider_code") REFERENCES "billing"."payment_providers"("code") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

}
