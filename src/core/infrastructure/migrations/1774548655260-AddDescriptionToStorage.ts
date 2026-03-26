import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDescriptionToStorage1774548655260 implements MigrationInterface {
    name = 'AddDescriptionToStorage1774548655260'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authz"."user_permission_grants" DROP CONSTRAINT "FK_upg_action_key"`);
        await queryRunner.query(`ALTER TABLE "tenants"."tenant_invitations" DROP CONSTRAINT "FK_tenant_invitations_role"`);
        await queryRunner.query(`ALTER TABLE "authz"."role_delegation_rules" DROP CONSTRAINT "FK_rdr_inviter_role"`);
        await queryRunner.query(`ALTER TABLE "authz"."role_delegation_rules" DROP CONSTRAINT "FK_rdr_target_role"`);
        await queryRunner.query(`ALTER TABLE "tenants"."tenant_members" DROP CONSTRAINT "FK_tenant_members_role"`);
        await queryRunner.query(`ALTER TABLE "authz"."role_action_grants" DROP CONSTRAINT "FK_rag_action_key"`);
        await queryRunner.query(`ALTER TABLE "authz"."role_action_grants" DROP CONSTRAINT "FK_rag_role_key"`);
        await queryRunner.query(`DROP INDEX "authz"."IDX_upg_active_grant"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "authz"."role_delegation_rules" ADD CONSTRAINT "FK_5966af379826117f1085129447f" FOREIGN KEY ("inviter_role_key") REFERENCES "authz"."roles"("key") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "authz"."role_delegation_rules" ADD CONSTRAINT "FK_84616206d58b974807b44af4edb" FOREIGN KEY ("target_role_key") REFERENCES "authz"."roles"("key") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "authz"."role_action_grants" ADD CONSTRAINT "FK_81a15aa714b1b6732d822222487" FOREIGN KEY ("role_key") REFERENCES "authz"."roles"("key") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "authz"."role_action_grants" DROP CONSTRAINT "FK_81a15aa714b1b6732d822222487"`);
        await queryRunner.query(`ALTER TABLE "authz"."role_delegation_rules" DROP CONSTRAINT "FK_84616206d58b974807b44af4edb"`);
        await queryRunner.query(`ALTER TABLE "authz"."role_delegation_rules" DROP CONSTRAINT "FK_5966af379826117f1085129447f"`);
        await queryRunner.query(`ALTER TABLE "storage"."storages" DROP COLUMN "description"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_upg_active_grant" ON "authz"."user_permission_grants" ("tenant_id", "user_id", "action_key") WHERE (revoked_at IS NULL)`);
        await queryRunner.query(`ALTER TABLE "authz"."role_action_grants" ADD CONSTRAINT "FK_rag_role_key" FOREIGN KEY ("role_key") REFERENCES "authz"."roles"("key") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "authz"."role_action_grants" ADD CONSTRAINT "FK_rag_action_key" FOREIGN KEY ("action_key") REFERENCES "capabilities"."catalog_actions"("key") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "tenants"."tenant_members" ADD CONSTRAINT "FK_tenant_members_role" FOREIGN KEY ("role") REFERENCES "authz"."roles"("key") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "authz"."role_delegation_rules" ADD CONSTRAINT "FK_rdr_target_role" FOREIGN KEY ("target_role_key") REFERENCES "authz"."roles"("key") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "authz"."role_delegation_rules" ADD CONSTRAINT "FK_rdr_inviter_role" FOREIGN KEY ("inviter_role_key") REFERENCES "authz"."roles"("key") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenants"."tenant_invitations" ADD CONSTRAINT "FK_tenant_invitations_role" FOREIGN KEY ("role") REFERENCES "authz"."roles"("key") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "authz"."user_permission_grants" ADD CONSTRAINT "FK_upg_action_key" FOREIGN KEY ("action_key") REFERENCES "capabilities"."catalog_actions"("key") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
