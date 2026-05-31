import rawAnalyticsData from "../data/analytics.json";

export interface AnalyticsMetric {
  clicks: number;
  [key: string]: any;
}

export interface TrendData {
  date: string;
  clicks: number;
}

export interface AnalyticsData {
  daily: TrendData[];
  countries: AnalyticsMetric[];
  continents: AnalyticsMetric[];
  devices: AnalyticsMetric[];
  os: AnalyticsMetric[];
  referrers: AnalyticsMetric[];
  topLinks: AnalyticsMetric[];
  [key: string]: any;
}

export class AnalyticsService {
  private static readonly CONSTANTS = {
    TREND_WAVE_AMPLITUDE: 10,
    TREND_SLOPE_MULTIPLIER: 60,
    TREND_BASE_OFFSET: 20,
    FLAT_WAVE_AMPLITUDE: 20,
    FLAT_BASE_OFFSET: 50,
    RANDOM_MAX_CLICKS: 150,
    MIN_CLICKS: 5,
  };

  /**
   * Processes an array of metrics to proportionally distribute a total number of clicks.
   * Can distribute randomly or deterministically based on original click weighting.
   * 
   * @param data - The array of metrics to process
   * @param totalClicks - The target sum of clicks
   * @param isRandom - If true, distributes clicks randomly. Otherwise, uses existing proportions.
   * @returns A new array of metrics with updated click counts
   */
  public processProportionalData<T extends AnalyticsMetric>(
    data: T[],
    totalClicks: number,
    isRandom: boolean
  ): T[] {
    if (!data || data.length === 0) return [];

    return isRandom
      ? this.applyRandomProportions(data, totalClicks)
      : this.applyDeterministicProportions(data, totalClicks);
  }

  /**
   * Generates dynamic daily trend data for a specified number of days.
   * 
   * @param days - Number of days to generate data for
   * @param isRandom - If true, generates completely random click counts
   * @param isTrending - If true, applies an upward trend line along with a sine wave variation
   * @returns An array of daily trend metrics
   */
  public generateTrend(days: number, isRandom: boolean, isTrending: boolean): TrendData[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for stability

    return Array.from({ length: days }).map((_, index) => {
      const daysAgo = days - 1 - index;
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - daysAgo);

      const dateStr = targetDate.toISOString().split("T")[0];
      const clicks = isRandom
        ? this.generateRandomClicks()
        : this.calculateDeterministicClicks(days, daysAgo, isTrending);

      return { date: dateStr, clicks };
    });
  }

  /**
   * Retrieves the baseline raw analytics mock data.
   */
  public getAnalyticsData(): AnalyticsData {
    return rawAnalyticsData as AnalyticsData;
  }

  private applyRandomProportions<T extends AnalyticsMetric>(data: T[], totalClicks: number): T[] {
    const randomWeights = data.map(() => Math.random());
    const weightSum = this.sum(randomWeights) || 1;

    let currentSum = 0;
    const result = data.map((item, index) => {
      const isLast = index === data.length - 1;
      const scaledClicks = isLast
        ? Math.max(0, totalClicks - currentSum)
        : Math.floor((randomWeights[index] / weightSum) * totalClicks);
      
      currentSum += scaledClicks;
      return { ...item, clicks: scaledClicks };
    });

    // Random data receives random weights, so we sort it to look organic
    return result.sort((a, b) => b.clicks - a.clicks);
  }

  private applyDeterministicProportions<T extends AnalyticsMetric>(data: T[], totalClicks: number): T[] {
    const baseTotal = this.sum(data.map((item) => item.clicks)) || 1;
    
    let currentSum = 0;
    return data.map((item, index) => {
      const isLast = index === data.length - 1;
      const scaledClicks = isLast
        ? Math.max(0, totalClicks - currentSum)
        : Math.floor((item.clicks / baseTotal) * totalClicks);

      currentSum += scaledClicks;
      return { ...item, clicks: scaledClicks };
    });
  }

  private calculateDeterministicClicks(totalDays: number, daysAgo: number, isTrending: boolean): number {
    const progress = (totalDays - 1 - daysAgo) / (totalDays - 1 || 1);
    const sineWave = Math.sin(daysAgo / (totalDays / 4 || 1));

    let trendValue: number;
    if (isTrending) {
      trendValue =
        sineWave * AnalyticsService.CONSTANTS.TREND_WAVE_AMPLITUDE +
        progress * AnalyticsService.CONSTANTS.TREND_SLOPE_MULTIPLIER +
        AnalyticsService.CONSTANTS.TREND_BASE_OFFSET;
    } else {
      trendValue =
        sineWave * AnalyticsService.CONSTANTS.FLAT_WAVE_AMPLITUDE +
        AnalyticsService.CONSTANTS.FLAT_BASE_OFFSET;
    }

    return Math.max(
      AnalyticsService.CONSTANTS.MIN_CLICKS,
      Math.floor(trendValue)
    );
  }

  private generateRandomClicks(): number {
    return Math.floor(Math.random() * AnalyticsService.CONSTANTS.RANDOM_MAX_CLICKS);
  }

  private sum(values: number[]): number {
    return values.reduce((acc, val) => acc + val, 0);
  }
}

export const analyticsService = new AnalyticsService();
