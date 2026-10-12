import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { AnalyticsService, type AnalyticsMetric } from "./AnalyticsService";

const NOON_MS = Date.UTC(2026, 5, 15, 12, 0, 0);
const TODAY_ISO_DATE = "2026-06-15";
const MIN_CLICKS = 5;
const RANDOM_MAX_CLICKS = 150;
const WEEK_DAYS = 7;
const MONTH_DAYS = 30;
let service: AnalyticsService;

function sumValues(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function sumClicks(metrics: AnalyticsMetric[]): number {
  return sumValues(metrics.map((metric) => metric.clicks));
}

function createMetrics(...clicks: number[]): AnalyticsMetric[] {
  return clicks.map((value, index) => ({ label: `item-${index}`, clicks: value }));
}

beforeEach(() => {
  service = new AnalyticsService();
});

describe("AnalyticsService.processProportionalData", () => {
  it("returns an empty array for empty input", () => {
    assert.deepEqual(service.processProportionalData([], 100, false), []);
    assert.deepEqual(service.processProportionalData([], 100, true), []);
  });

  it("scales deterministically so that the total matches exactly", () => {
    const scaled = service.processProportionalData(createMetrics(50, 30, 20), 1000, false);
    assert.deepEqual(scaled.map((metric) => metric.clicks), [500, 300, 200]);
  });

  it("keeps the total exact when the proportions do not divide evenly", () => {
    const scaled = service.processProportionalData(createMetrics(1, 1, 1), 100, false);
    assert.equal(sumClicks(scaled), 100);
  });

  it("preserves the other fields and does not mutate the input", () => {
    const source = [{ label: "US", hostname: "x.com", clicks: 10 }];
    const [scaled] = service.processProportionalData(source, 40, false);
    assert.deepEqual(scaled, { label: "US", hostname: "x.com", clicks: 40 });
    assert.equal(source[0].clicks, 10);
  });

  it("distributes the total across zero-weighted input without dividing by zero", () => {
    const scaled = service.processProportionalData(createMetrics(0, 0), 10, false);
    assert.equal(sumClicks(scaled), 10);
  });

  it("randomly distributes the exact total sorted from most to fewest clicks", () => {
    const scaled = service.processProportionalData(createMetrics(1, 1, 1, 1), 500, true);
    assert.equal(sumClicks(scaled), 500);
    const clicks = scaled.map((metric) => metric.clicks);
    assert.deepEqual(clicks, [...clicks].sort((a, b) => b - a));
  });
});

describe("AnalyticsService.generateTrend", () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ["Date"], now: NOON_MS });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it("returns one entry per day ending today in ascending order", () => {
    const trend = service.generateTrend(WEEK_DAYS, false, false);
    assert.equal(trend.length, WEEK_DAYS);
    assert.equal(trend.at(-1)?.date, TODAY_ISO_DATE);
    const dates = trend.map((entry) => entry.date);
    assert.deepEqual(dates, [...dates].sort());
    assert.equal(new Set(dates).size, WEEK_DAYS);
  });

  it("is deterministic when not random", () => {
    assert.deepEqual(service.generateTrend(MONTH_DAYS, false, true), service.generateTrend(MONTH_DAYS, false, true));
  });

  it("never drops below the minimum number of clicks", () => {
    for (const isTrending of [true, false]) {
      const clicks = service.generateTrend(MONTH_DAYS, false, isTrending).map((entry) => entry.clicks);
      assert.ok(Math.min(...clicks) >= MIN_CLICKS);
    }
  });

  it("rises over the period when trending", () => {
    const clicks = service.generateTrend(MONTH_DAYS, false, true).map((entry) => entry.clicks);
    const firstHalfAverage = sumValues(clicks.slice(0, MONTH_DAYS / 2)) / (MONTH_DAYS / 2);
    const secondHalfAverage = sumValues(clicks.slice(MONTH_DAYS / 2)) / (MONTH_DAYS / 2);
    assert.ok(secondHalfAverage > firstHalfAverage);
  });

  it("keeps random clicks below the configured maximum", () => {
    const clicks = service.generateTrend(MONTH_DAYS, true, false).map((entry) => entry.clicks);
    assert.ok(clicks.every((value) => value >= 0 && value < RANDOM_MAX_CLICKS));
  });

  it("returns an empty trend for zero days", () => {
    assert.deepEqual(service.generateTrend(0, false, false), []);
  });

  it("handles a single day without producing NaN", () => {
    const [entry] = service.generateTrend(1, false, true);
    assert.ok(Number.isFinite(entry.clicks));
  });
});

describe("AnalyticsService.getAnalyticsData", () => {
  it("exposes every group used by the analytics endpoint", () => {
    const data = service.getAnalyticsData();
    for (const group of ["daily", "countries", "continents", "devices", "os", "referrers", "topLinks"] as const) {
      assert.ok(data[group].length > 0, `${group} should not be empty`);
    }
  });
});
