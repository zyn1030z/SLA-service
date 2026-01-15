
class SlaCalculator {
  private readonly BUSINESS_TIMEZONE_OFFSET = 7; // UTC+7
  private readonly BUSINESS_START_HOUR = 8; 
  private readonly BUSINESS_END_HOUR = 17; 

  private toBusinessTimezone(utcDate: Date): Date {
    return new Date(utcDate.getTime() + this.BUSINESS_TIMEZONE_OFFSET * 60 * 60 * 1000);
  }
  
  private fromBusinessTimezone(businessDate: Date): Date {
    return new Date(businessDate.getTime() - this.BUSINESS_TIMEZONE_OFFSET * 60 * 60 * 1000);
  }

  private isValidBusinessDayShifted(shiftedDate: Date): boolean {
    const day = shiftedDate.getUTCDay(); // 0: Sun, 6: Sat
    const hour = shiftedDate.getUTCHours();

    if (day >= 1 && day <= 5) {
      return true;
    }
    if (day === 6) {
      return hour < 12;
    }
    return false;
  }

  private getBusinessEndHourForDay(date: Date): number {
    const day = date.getUTCDay();
    if (day === 6) {
      return 12;
    }
    return this.BUSINESS_END_HOUR;
  }
  
  private isBusinessHoursShifted(shiftedDate: Date): boolean {
      if (!this.isValidBusinessDayShifted(shiftedDate)) {
          return false;
      }
      const hour = shiftedDate.getUTCHours();
      const businessEndHour = this.getBusinessEndHourForDay(shiftedDate);
      return hour >= this.BUSINESS_START_HOUR && hour < businessEndHour;
  }
  
  private normalizeToBusinessStartShifted(shiftedDate: Date): Date {
      let normalized = new Date(shiftedDate);
      const hour = normalized.getUTCHours();
      const day = normalized.getUTCDay();
      const businessEndHour = this.getBusinessEndHourForDay(normalized);

      if (day === 0 || (day === 6 && hour >= 12)) {
          normalized = this.moveToNextBusinessDayShifted(normalized);
          return normalized;
      }

      if (hour < this.BUSINESS_START_HOUR) {
          normalized.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0);
      } else if (hour >= businessEndHour) {
          normalized = this.moveToNextBusinessDayShifted(normalized);
      } else {
          normalized.setUTCMinutes(0, 0, 0);
      }
      return normalized;
  }

  private moveToNextBusinessDayShifted(shiftedDate: Date): Date {
      const next = new Date(shiftedDate);
      next.setUTCHours(this.BUSINESS_START_HOUR, 0, 0, 0); 
      do {
          next.setUTCDate(next.getUTCDate() + 1); 
      } while (!this.isValidBusinessDayShifted(next)); 
      
      return next;
  }

  public calculateNextDueAt(
    startTime: Date,
    slaHours: number,
    violationCount: number = 0
  ): Date {
    let current = this.toBusinessTimezone(startTime);
    let remainingSlaHours = slaHours * (violationCount + 1);

    if (!this.isBusinessHoursShifted(current)) {
        current = this.normalizeToBusinessStartShifted(current);
    } else {
        const businessEndHour = this.getBusinessEndHourForDay(current);
        const currentHour = current.getUTCHours();
        const currentMinute = current.getUTCMinutes();
        const hoursUntilEndOfDay = (businessEndHour * 60 - (currentHour * 60 + currentMinute)) / 60;

         if (hoursUntilEndOfDay < remainingSlaHours) {
            remainingSlaHours -= hoursUntilEndOfDay;
            current.setUTCHours(businessEndHour, 0, 0, 0); 
            current = this.moveToNextBusinessDayShifted(current);
         }
    }

    while (remainingSlaHours > 0) {
      const businessEndHour = this.getBusinessEndHourForDay(current);
      const currentHour = current.getUTCHours();
      const currentMinute = current.getUTCMinutes();
      
      const timeLeftInDay = (businessEndHour * 60 - (currentHour * 60 + currentMinute)) / 60;

      if (timeLeftInDay >= remainingSlaHours) {
          const minutesToAdd = remainingSlaHours * 60;
          current.setUTCMinutes(current.getUTCMinutes() + minutesToAdd);
          remainingSlaHours = 0;
      } else {
          remainingSlaHours -= timeLeftInDay;
          current = this.moveToNextBusinessDayShifted(current);
      }
    }

    return this.fromBusinessTimezone(current);
  }
}

const calc = new SlaCalculator();
const slaHours = 1;

// Case 1: Start Time is 15:40 LOCAL (08:40 UTC)
const startLocal = new Date("2026-01-15T08:40:18Z");
const dueLocal = calc.calculateNextDueAt(startLocal, slaHours);
console.log(`[Case 1] Input 08:40 UTC (15:40 Local). Due: ${dueLocal.toISOString()} (Local: ${new Date(dueLocal.getTime() + 7*3600*1000).toISOString()})`);

// Case 2: Start Time is 15:40 UTC (22:40 Local)
const startUTC = new Date("2026-01-15T15:40:18Z");
const dueUTC = calc.calculateNextDueAt(startUTC, slaHours);
console.log(`[Case 2] Input 15:40 UTC (22:40 Local). Due: ${dueUTC.toISOString()} (Local: ${new Date(dueUTC.getTime() + 7*3600*1000).toISOString()})`);
