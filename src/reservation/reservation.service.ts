import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DayTimetable,
  RequestBody,
  Timeslot,
} from 'src/interfaces/reservation.interface';
import * as workhours from '../../_workhours.json';
import * as events from '../../_event.json';

@Injectable()
export class ReservationServcie {
  private readonly DEFAULT_TIMESLOT_INTERVAL = 1800;
  private readonly DEFAULT_DAYS = 1;
  private readonly DEFAULT_IS_IGNORE_SCHEDULE = false;
  private readonly DEFAULT_IS_IGNORE_WORKHOUR = false;

  constructor() {}

  getTimeSlots(requestBody: RequestBody): DayTimetable[] {
    if (!requestBody.start_day_identifier) {
      throw new BadRequestException('start_day_identifier required');
    }
    if (!requestBody.service_duration) {
      throw new BadRequestException('service_duration required');
    }

    const startDay = this.formattedDate(
      requestBody.start_day_identifier,
      requestBody.timezone_identifier,
    );

    return this.generateDayTimetables(startDay, requestBody);
  }

  private generateDayTimetables(
    startDay: Date,
    requestBody: RequestBody,
  ): DayTimetable[] {
    const dayTimetables: DayTimetable[] = [];
    for (let i = 0; i < (requestBody.days || this.DEFAULT_DAYS); i++) {
      const currentDay = this.addDays(startDay, i);
      const weekday = (currentDay.getDay() + 1) % 7 || 7;
      const workhour = workhours.find((el) => el.weekday === weekday);

      const isDayOff = workhour?.is_day_off || false;

      if (
        !this.shouldProcessWorkhour(requestBody.is_ignore_workhour, isDayOff)
      ) {
        dayTimetables.push(this.createDayOffTimetable(currentDay, i));
        continue;
      }

      const timeslots = this.generateTimeslots(
        currentDay,
        workhour,
        requestBody,
      );

      dayTimetables.push(this.createWorkDayTimetable(currentDay, i, timeslots));
    }

    return dayTimetables;
  }

  private addDays(date: Date, days: number): Date {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }

  private shouldProcessWorkhour(
    isIgnoreWorkhour: boolean,
    isDayOff: boolean,
  ): boolean {
    return !(isIgnoreWorkhour || (this.DEFAULT_IS_IGNORE_WORKHOUR && isDayOff));
  }

  private createDayOffTimetable(
    currentDay: Date,
    dayModifier: number,
  ): DayTimetable {
    return {
      start_of_day: Math.floor(currentDay.getTime() / 1000),
      day_modifier: dayModifier,
      is_day_off: true,
      timeslots: [],
    };
  }

  private createWorkDayTimetable(
    currentDay: Date,
    dayModifier: number,
    timeslots: Timeslot[],
  ): DayTimetable {
    return {
      start_of_day: Math.floor(currentDay.getTime() / 1000),
      day_modifier: dayModifier,
      is_day_off: false,
      timeslots,
    };
  }

  private generateTimeslots(
    currentDay: Date,
    workhour: any,
    requestBody: RequestBody,
  ): Timeslot[] {
    const openTime = this.calcTime(
      currentDay,
      requestBody.is_ignore_workhour ? 0 : workhour.open_interval,
    );
    const closeTime = this.calcTime(
      currentDay,
      requestBody.is_ignore_workhour ? 86400 : workhour.close_interval,
    );
    const timeslots: Timeslot[] = [];

    for (
      let time = Math.floor(openTime);
      time + requestBody.service_duration <= Math.floor(closeTime);
      time += requestBody.timeslot_interval || this.DEFAULT_TIMESLOT_INTERVAL
    ) {
      const beginAt = time;
      const endAt = time + requestBody.service_duration;

      if (
        !requestBody.is_ignore_schedule &&
        this.isOverlappingWithEvents(beginAt, endAt, requestBody)
      ) {
        continue;
      }

      timeslots.push({ begin_at: beginAt, end_at: endAt });
    }

    return timeslots;
  }

  private isOverlappingWithEvents(
    beginAt: number,
    endAt: number,
    requestBody: RequestBody,
  ): boolean {
    if (requestBody.is_ignore_schedule || this.DEFAULT_IS_IGNORE_SCHEDULE) {
      return false;
    }
    return events.some((event) => {
      const eventStart = event.begin_at;
      const eventEnd = event.end_at;

      return (
        (beginAt >= eventStart && beginAt < eventEnd) || // 타임슬롯의 시작이 이벤트 안에 있는 경우
        (endAt > eventStart && endAt <= eventEnd) || // 타임슬롯의 끝이 이벤트 안에 있는 경우
        (beginAt <= eventStart && endAt >= eventEnd) // 타임슬롯이 이벤트를 완전히 포함하는 경우
      );
    });
  }

  private formattedDate(dateStr: string, timeZone: string) {
    if (!dateStr || typeof dateStr !== 'string') {
      throw new BadRequestException('invalid dateStr param');
    }
    const [year, month, day] = [
      dateStr.slice(0, 4),
      dateStr.slice(4, 6),
      dateStr.slice(6, 8),
    ];
    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );

    return new Date(date.toLocaleDateString('en-US', { timeZone }));
  }

  private calcTime(baseDate: Date, interval: number): number {
    const date = new Date(baseDate);
    date.setSeconds(date.getSeconds() + interval);

    return Math.floor(date.getTime() / 1000);
  }
}
