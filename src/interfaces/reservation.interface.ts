export interface RequestBody {
  start_day_identifier: string;
  timezone_identifier: string;
  service_duration: number;
  days?: number;
  timeslot_interval?: number;
  is_ignore_schedule?: boolean;
  is_ignore_workhour?: boolean;
}

export interface DayTimetable {
  start_of_day: number;
  day_modifier: number;
  is_day_off: boolean;
  timeslots: Timeslot[];
}

export interface Timeslot {
  begin_at: number;
  end_at: number;
}
