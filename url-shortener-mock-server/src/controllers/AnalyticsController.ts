import { Request, Response } from "express";
import { analyticsService } from "../services/AnalyticsService";
import { shortLinksService } from "../services/ShortLinksService";
import { AuthenticatedRequest } from "../middleware/authentication";

export class AnalyticsController {
  public static getAnalytics(req: Request, res: Response): void {
    const uuid = (req as AuthenticatedRequest).user?.uuid || "default";
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
      uuid,
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
    uuid: string,
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
      if (groupBy === "top_link") {
        // Enforce user isolation: only return links that this user actually owns
        const userLinks = shortLinksService.getAllLinks(uuid);
        const userLinkIds = new Set(userLinks.map((l) => l.id));
        
        let filteredTopLinks = mockData.topLinks.filter((item: any) => userLinkIds.has(item.shortLinkId));
        
        // Dynamically add any newly created links that are not yet in the baseline topLinks
        const topLinkIds = new Set(filteredTopLinks.map((item: any) => item.shortLinkId));
        for (const link of userLinks) {
          if (!topLinkIds.has(link.id)) {
            filteredTopLinks.push({ shortLinkId: link.id, clicks: 12 });
          }
        }

        return analyticsService.processProportionalData(filteredTopLinks, expectedTotal, isRandom);
      }

      return analyticsService.processProportionalData(mockData[targetKey], expectedTotal, isRandom);
    }

    // Fallback if groupBy is unrecognized
    return expectedTotal;
  }
}
