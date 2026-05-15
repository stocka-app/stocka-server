import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';

import { PaymentProviderEntity } from '@billing/infrastructure/entities/payment-provider.entity';
import { PricingPlanEntity } from '@billing/infrastructure/entities/pricing-plan.entity';
import { ProviderPriceMappingEntity } from '@billing/infrastructure/entities/provider-price-mapping.entity';
import { SubscriptionEntity } from '@billing/infrastructure/entities/subscription.entity';
import { SubscriptionChangeEntity } from '@billing/infrastructure/entities/subscription-change.entity';
import { SubscriptionEventEntity } from '@billing/infrastructure/entities/subscription-event.entity';
import { InvoiceEntity } from '@billing/infrastructure/entities/invoice.entity';
import { PaymentProviderEventEntity } from '@billing/infrastructure/entities/payment-provider-event.entity';

import { MediatorModule } from '@shared/infrastructure/mediator/mediator.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentProviderEntity,
      PricingPlanEntity,
      ProviderPriceMappingEntity,
      SubscriptionEntity,
      SubscriptionChangeEntity,
      SubscriptionEventEntity,
      InvoiceEntity,
      PaymentProviderEventEntity,
    ]),
    CqrsModule,
    MediatorModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class BillingModule {}
