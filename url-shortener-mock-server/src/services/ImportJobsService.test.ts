import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {beforeEach, describe, it} from "node:test";
import {setTimeout as wait} from "node:timers/promises";
import {ImportJobsService, type ImportProgress} from "./ImportJobsService";
import {memoryStore} from "./MemoryStore";

const CSV_TEXT = "Short link,Destination URL,Title\n,https://example.com/one,One\n,not-a-url,Invalid\n,https://example.com/two,Two";
const JOB_WAIT_MS = 450;
let userId: string;
let service: ImportJobsService;

beforeEach(() => {
  userId = randomUUID();
  memoryStore.registerUserSession(userId).links = [];
  service = new ImportJobsService();
});

describe("asynchronous mock import", () => {
  it("returns the Spring job DTO before importing rows", async () => {
    const result = service.submit(userId, CSV_TEXT, true, "links.csv");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.job.status, "QUEUED");
    assert.equal(result.job.totalRows, 3);
    assert.equal(result.job.processedRows, 0);
    assert.equal(result.job.fileName, "links.csv");
    assert.equal(result.job.generateTakenKeys, true);
    assert.equal(result.job.startedTimestamp, null);
    assert.equal(result.job.completedTimestamp, null);
    assert.equal(result.job.expiresTimestamp, null);
    assert.equal(memoryStore.getUserState(userId).links.length, 0);
    await wait(JOB_WAIT_MS);
    assert.equal(memoryStore.getUserState(userId).links.length, 2);
  });

  it("emits a snapshot and progress for both successful and failed rows, then closes", async () => {
    service.submit(userId, CSV_TEXT, false);
    const updates: ImportProgress[] = [];
    let hasClosed = false;
    service.subscribe(userId, {onProgress: (progress) => { updates.push(progress); }, onClose: () => { hasClosed = true; }});
    assert.deepEqual(updates, [{processedRows: 0, totalRows: 3}]);
    await wait(JOB_WAIT_MS);
    assert.deepEqual(updates, [0, 1, 2, 3].map((processedRows) => ({processedRows, totalRows: 3})));
    assert.equal(hasClosed, true);
    assert.equal(memoryStore.getUserState(userId).links.length, 2);
  });

  it("rejects duplicate active jobs and allows a new import after completion", async () => {
    service.submit(userId, CSV_TEXT, false);
    assert.deepEqual(service.submit(userId, CSV_TEXT, false), {
      ok: false, status: 422, error: "An import job is already ongoing for this user",
    });
    await wait(JOB_WAIT_MS);
    assert.equal(service.submit(userId, CSV_TEXT, false).ok, true);
    await wait(JOB_WAIT_MS);
  });

  it("supports two windows and detaching one keeps the other updating", async () => {
    service.submit(userId, CSV_TEXT, false);
    const firstUpdates: ImportProgress[] = [];
    let firstHasClosed = false;
    const detachFirst = service.subscribe(userId, {onProgress: (progress) => { firstUpdates.push(progress); }, onClose: () => { firstHasClosed = true; }});
    const secondUpdates: ImportProgress[] = [];
    let secondHasClosed = false;
    service.subscribe(userId, {onProgress: (progress) => { secondUpdates.push(progress); }, onClose: () => { secondHasClosed = true; }});
    detachFirst();
    assert.equal(firstHasClosed, false);
    await wait(JOB_WAIT_MS);
    assert.equal(secondUpdates.at(-1)?.processedRows, 3);
    assert.equal(secondHasClosed, true);
  });

  it("closes with no events when there is no active job", () => {
    let hasClosed = false;
    const updates: ImportProgress[] = [];
    service.subscribe(userId, {onProgress: (progress) => { updates.push(progress); }, onClose: () => { hasClosed = true; }});
    assert.equal(hasClosed, true);
    assert.deepEqual(updates, []);
  });

  it("accepts a file whose rows all fail and skips them per-row", async () => {
    const invalidCsv = "Short link,Destination URL,Title\n,not-a-url,Invalid\n, ,Blank destination\ntook-too-long-key-that-exceeds-the-limit-0123456789,https://example.com/ok,Bad key";
    const result = service.submit(userId, invalidCsv, false);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.job.totalRows, 3);
    assert.equal(result.job.status, "QUEUED");
    const updates: ImportProgress[] = [];
    let hasClosed = false;
    service.subscribe(userId, {onProgress: (progress) => { updates.push(progress); }, onClose: () => { hasClosed = true; }});
    await wait(JOB_WAIT_MS);
    assert.deepEqual(updates.at(-1), {processedRows: 3, totalRows: 3});
    assert.equal(hasClosed, true);
    assert.equal(memoryStore.getUserState(userId).links.length, 0);
    assert.equal(service.submit(userId, CSV_TEXT, false).ok, true);
    await wait(JOB_WAIT_MS);
  });

  it("completes immediately when every row is blank", () => {
    const result = service.submit(userId, "Short link,Destination URL,Title\n,,,\n , , ", false);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.job.totalRows, 0);
    assert.equal(result.job.status, "COMPLETED");
    assert.notEqual(result.job.completedTimestamp, null);
    let hasClosed = false;
    const updates: ImportProgress[] = [];
    service.subscribe(userId, {onProgress: (progress) => { updates.push(progress); }, onClose: () => { hasClosed = true; }});
    assert.equal(hasClosed, true);
    assert.deepEqual(updates, []);
    assert.equal(service.submit(userId, CSV_TEXT, false).ok, true);
  });

  it("still rejects files without a destination column", () => {
    const result = service.submit(userId, "Short link,Title\nkey,Name", false);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 400);
  });

  it("validates CSV and filenames before scheduling a job", () => {
    assert.equal(service.submit(userId, "wrong header\nvalue", false).ok, false);
    assert.equal(service.submit(userId, CSV_TEXT, false, "x".repeat(256)).ok, false);
  });
});
