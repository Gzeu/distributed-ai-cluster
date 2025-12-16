interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private minuteLimits: Map<string, RateLimitRecord> = new Map();
  private dayLimits: Map<string, RateLimitRecord> = new Map();

  checkLimit(
    key: string,
    requestsPerMinute: number,
    requestsPerDay: number
  ): { allowed: boolean; reason?: string; retryAfter?: number } {
    const now = Date.now();

    // Check minute limit
    const minuteKey = `${key}:minute`;
    let minuteRecord = this.minuteLimits.get(minuteKey);

    if (!minuteRecord || now > minuteRecord.resetAt) {
      minuteRecord = {
        count: 0,
        resetAt: now + 60 * 1000, // 1 minute
      };
      this.minuteLimits.set(minuteKey, minuteRecord);
    }

    if (minuteRecord.count >= requestsPerMinute) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded (per minute)',
        retryAfter: Math.ceil((minuteRecord.resetAt - now) / 1000),
      };
    }

    // Check day limit
    const dayKey = `${key}:day`;
    let dayRecord = this.dayLimits.get(dayKey);

    if (!dayRecord || now > dayRecord.resetAt) {
      dayRecord = {
        count: 0,
        resetAt: now + 24 * 60 * 60 * 1000, // 24 hours
      };
      this.dayLimits.set(dayKey, dayRecord);
    }

    if (dayRecord.count >= requestsPerDay) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded (per day)',
        retryAfter: Math.ceil((dayRecord.resetAt - now) / 1000),
      };
    }

    // Increment counters
    minuteRecord.count++;
    dayRecord.count++;

    return { allowed: true };
  }

  cleanup(): void {
    const now = Date.now();

    // Clean expired minute limits
    for (const [key, record] of this.minuteLimits.entries()) {
      if (now > record.resetAt) {
        this.minuteLimits.delete(key);
      }
    }

    // Clean expired day limits
    for (const [key, record] of this.dayLimits.entries()) {
      if (now > record.resetAt) {
        this.dayLimits.delete(key);
      }
    }
  }

  getRemainingRequests(
    key: string,
    requestsPerMinute: number,
    requestsPerDay: number
  ): { minute: number; day: number } {
    const minuteRecord = this.minuteLimits.get(`${key}:minute`);
    const dayRecord = this.dayLimits.get(`${key}:day`);

    return {
      minute: requestsPerMinute - (minuteRecord?.count || 0),
      day: requestsPerDay - (dayRecord?.count || 0),
    };
  }
}
