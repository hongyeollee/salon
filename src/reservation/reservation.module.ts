import { Module } from '@nestjs/common';
import { ReservationController } from './reservation.controller';
import { ReservationServcie } from './reservation.service';

@Module({
  imports: [],
  controllers: [ReservationController],
  providers: [ReservationServcie],
  exports: [],
})
export class ReservationModule {}
