import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { PartiesModule } from './parties/parties.module';
import { PurchasesModule } from './purchases/purchases.module';
import { StockModule } from './stock/stock.module';
import { ReportsModule } from './reports/reports.module';
import { ReturnsModule } from './returns/returns.module';
import { AlertsModule } from './alerts/alerts.module';
import { UsersModule } from './users/users.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    InventoryModule,
    SalesModule,
    PartiesModule,
    PurchasesModule,
    StockModule,
    ReportsModule,
    ReturnsModule,
    AlertsModule,
    UsersModule,
    ScheduleModule.forRoot(),
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      defaults: {
        from: process.env.SMTP_FROM,
      },
    }),
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
