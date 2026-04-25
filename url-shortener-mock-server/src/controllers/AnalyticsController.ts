import { Request, Response } from "express";
import { analyticsService } from "../services/AnalyticsService";

export class AnalyticsController {
  public static getAnalytics(req: Request, res: Response): void {
    const groupBy = req.query.groupBy as string | undefined;
    const period = req.query.period as string | undefined;
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;

    const days = AnalyticsController.calculateDays(period, start, end);

    // Handle constant comparison total (only when no groupBy is requested)
    if (start && end && !groupBy) {
      const priorTotal = AnalyticsController.resolvePriorTotal(days);
      res.json(priorTotal);
      return;
    }

    const isRandom = process.env.RANDOM_ANALYTICS_DATA === "true";
    const isTrending = AnalyticsController.determineTrendingDirection(period, days);

    // Pre-calculate the trend and expected total for all endpoints
    const trend = analyticsService.generateTrend(days, isRandom, isTrending);
    const expectedTotal = trend.reduce((sum, d) => sum + d.clicks, 0);
    const mockData = analyticsService.getAnalyticsData();

    const responsePayload = AnalyticsController.buildGroupedResponse(
      groupBy,
      expectedTotal,
      isRandom,
      trend,
      mockData
    );

    res.json(responsePayload);
  }

  private static calculateDays(period?: string, start?: string, end?: string): number {
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    if (period === "P30D") return 30;
    if (period === "P90D") return 90;
    return 7; // default for P7D or undefined
  }

  private static resolvePriorTotal(days: number): number {
    if (days <= 14) return 200; // 7d: current is ~370, return 200 for positive trend
    if (days <= 45) return 2000; // 30d: current is ~1500, return 2000 for negative trend
    return 3000; // 90d: current is ~4500, return 3000 for positive trend
  }

  private static determineTrendingDirection(period?: string, days?: number): boolean {
    if (period === "P30D") return false;
    if (period === "P7D" || period === "P90D") return true;
    return days === 7 || days === 90;
  }

  private static buildGroupedResponse(
    groupBy: string | undefined,
    expectedTotal: number,
    isRandom: boolean,
    trend: any[],
    mockData: any
  ): any {
    if (!groupBy) {
      return expectedTotal;
    }

    if (groupBy === "date") {
      return trend;
    }

    const groupKeyMap: Record<string, string> = {
      country: "countries",
      continent: "continents",
      device: "devices",
      os: "os",
      referrer: "referrers",
      top_link: "topLinks",
    };

    const targetKey = groupKeyMap[groupBy];
    if (targetKey && mockData[targetKey]) {
      return analyticsService.processProportionalData(mockData[targetKey], expectedTotal, isRandom);
    }

    // Fallback if groupBy is unrecognized
    return expectedTotal;
  }
}
