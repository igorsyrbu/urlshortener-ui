import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createTestUser, requestJson, startTestServer, type TestServer } from "../test-utils";

const HTTP_OK = 200;
const WEEK_DAYS = 7;
const MONTH_DAYS = 30;
const QUARTER_DAYS = 90;
const SEVEN_DAY_PRIOR_TOTAL = 200;
const THIRTY_DAY_PRIOR_TOTAL = 2000;
const NINETY_DAY_PRIOR_TOTAL = 3000;
let server: TestServer;
const user = createTestUser();

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

interface Metric {
  label?: string;
  shortLinkId?: string;
  clicks: number;
}

async function getAnalytics(query: string): Promise<unknown> {
  const response = await requestJson(server, "GET", `/analytics${query}`, { authorization: user.authorization });
  assert.equal(response.status, HTTP_OK);
  return response.body;
}

function sumClicks(metrics: Metric[]): number {
  return metrics.reduce((total, metric) => total + metric.clicks, 0);
}

describe("GET /analytics", () => {
  it("returns the total clicks of the default period without grouping", async () => {
    const total = await getAnalytics("");
    const trend = (await getAnalytics("?groupBy=date")) as Metric[];
    assert.equal(total, sumClicks(trend));
  });

  const periodCases: Array<[string, number]> = [["P7D", WEEK_DAYS], ["P30D", MONTH_DAYS], ["P90D", QUARTER_DAYS], ["", WEEK_DAYS]];
  for (const [period, days] of periodCases) {
    it(`returns ${days} daily entries for period "${period}"`, async () => {
      const trend = (await getAnalytics(`?groupBy=date&period=${period}`)) as unknown[];
      assert.equal(trend.length, days);
    });
  }

  const groupings = ["country", "continent", "device", "os", "referrer"];
  for (const groupBy of groupings) {
    it(`scales the ${groupBy} breakdown to the period total`, async () => {
      const total = (await getAnalytics("?period=P30D")) as number;
      const breakdown = (await getAnalytics(`?groupBy=${groupBy}&period=P30D`)) as Metric[];
      assert.equal(sumClicks(breakdown), total);
    });
  }

  it("falls back to the total for an unknown grouping", async () => {
    assert.equal(typeof (await getAnalytics("?groupBy=planet")), "number");
  });

  it("limits top links to the links of the user and adds new links with a baseline", async () => {
    const created = await requestJson(server, "POST", "/shortlinks", {
      authorization: user.authorization,
      body: { key: "topnew", longUrl: "https://example.com" },
    });
    const newLinkId = (created.body as { id: string }).id;
    const topLinks = (await getAnalytics("?groupBy=top_link")) as Metric[];
    const ownLinkIds = new Set(user.state.links.map((link) => link.id));
    assert.ok(topLinks.every((item) => item.shortLinkId && ownLinkIds.has(item.shortLinkId)));
    assert.ok(topLinks.some((item) => item.shortLinkId === newLinkId));
  });

  const priorTotals: Array<[string, number]> = [
    ["start=2026-01-01&end=2026-01-07", SEVEN_DAY_PRIOR_TOTAL],
    ["start=2026-01-01&end=2026-01-30", THIRTY_DAY_PRIOR_TOTAL],
    ["start=2026-01-01&end=2026-03-31", NINETY_DAY_PRIOR_TOTAL],
  ];
  for (const [range, expected] of priorTotals) {
    it(`returns the constant comparison total ${expected} for ${range}`, async () => {
      assert.equal(await getAnalytics(`?${range}`), expected);
    });
  }
});
