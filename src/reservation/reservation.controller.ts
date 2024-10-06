import { Body, Controller, Post } from '@nestjs/common';
import { ReservationServcie } from './reservation.service';
import {
  DayTimetable,
  RequestBody,
} from 'src/interfaces/reservation.interface';

@Controller()
export class ReservationController {
  constructor(private readonly reservationService: ReservationServcie) {}

  @Post('getTimeSlots')
  getTimeSlots(@Body() requestBody: RequestBody): DayTimetable[] {
    return this.reservationService.getTimeSlots(requestBody);
  }
}
