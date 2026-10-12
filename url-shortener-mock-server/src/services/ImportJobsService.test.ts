import assert from "node:assert/strict";
import {afterEach, beforeEach, describe, it, mock} from "node:test";
import {createTestUserWithoutLinks, type TestUser} from "../test-utils";
import {ImportJobsService, type ImportProgress, type LinkImportJob} from "./ImportJobsService";

const HEADER = "Short link,Destination URL,Title";
const CSV_TEXT = `${HEADER}\n,https://example.com/one,One\n,not-a-url,Invalid\n,https://example.com/two,Two`;
const CSV_ROW_COUNT = 3;
const CSV_VALID_ROW_COUNT = 2;
const ROW_DELAY_MS = 100;
const MAX_FILE_NAME_LENGTH = 255;
const KEY_MAX_LENGTH = 30;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNPROCESSABLE_ENTITY = 422;
let user: TestUser;
let service: ImportJobsService;

interface ProgressRecorder {
  updates: ImportProgress[];
  hasClosed: () => boolean;
  detach: () => void;
}

function subscribeAndRecord(): ProgressRecorder {
  const updates: ImportProgress[] = [];
  let hasClosed = false;
  const detach = service.subscribe(user.uuid, {
    onProgress: (progress) => { updates.push(progress); },
    onClose: () => { hasClosed = true; },
  });
  return {updates, hasClosed: () => hasClosed, detach};
}

function submitAccepted(csvText: string, generateTakenKeys = false, fileName?: string): LinkImportJob {
  const result = service.submit(user.uuid, csvText, generateTakenKeys, fileName);
  assert.ok(result.ok, "expected the import to be accepted");
  return result.job;
}

function finishImport(rowCount: number): void {
  mock.timers.tick(ROW_DELAY_MS * rowCount);
}

beforeEach(() => {
  mock.timers.enable({apis: ["setInterval", "Date"]});
  user = createTestUserWithoutLinks();
  service = new ImportJobsService();
});

afterEach(() => {
  mock.timers.reset();
});

describe("asynchronous mock import", () => {
  it("returns the queued job DTO before any row is imported", () => {
    const job = submitAccepted(CSV_TEXT, true, "links.csv");
    assert.equal(job.status, "QUEUED");
    assert.equal(job.totalRows, CSV_ROW_COUNT);
    assert.equal(job.processedRows, 0);
    assert.equal(job.fileName, "links.csv");
    assert.equal(job.generateTakenKeys, true);
    assert.equal(job.startedTimestamp, null);
    assert.equal(job.completedTimestamp, null);
    assert.equal(job.expiresTimestamp, null);
    assert.equal(user.state.links.length, 0);
  });

  it("imports one row per tick and skips the invalid ones", () => {
    submitAccepted(CSV_TEXT);
    mock.timers.tick(ROW_DELAY_MS);
    assert.equal(user.state.links.length, 1);
    finishImport(CSV_ROW_COUNT);
    assert.equal(user.state.links.length, CSV_VALID_ROW_COUNT);
  });

  it("emits a snapshot and progress for successful and failed rows, then closes", () => {
    submitAccepted(CSV_TEXT);
    const recorder = subscribeAndRecord();
    assert.deepEqual(recorder.updates, [{processedRows: 0, totalRows: CSV_ROW_COUNT}]);
    finishImport(CSV_ROW_COUNT);
    assert.deepEqual(recorder.updates.map((update) => update.processedRows), [0, 1, 2, 3]);
    assert.equal(recorder.hasClosed(), true);
  });

  it("rejects a duplicate active job and allows a new import after completion", () => {
    submitAccepted(CSV_TEXT);
    assert.deepEqual(service.submit(user.uuid, CSV_TEXT, false), {
      ok: false, status: HTTP_UNPROCESSABLE_ENTITY, error: "An import job is already ongoing for this user",
    });
    finishImport(CSV_ROW_COUNT);
    assert.equal(service.submit(user.uuid, CSV_TEXT, false).ok, true);
  });

  it("lets several windows follow one job and detaching one keeps the other updating", () => {
    submitAccepted(CSV_TEXT);
    const first = subscribeAndRecord();
    const second = subscribeAndRecord();
    first.detach();
    assert.equal(first.hasClosed(), false);
    finishImport(CSV_ROW_COUNT);
    assert.equal(first.updates.at(-1)?.processedRows, 0);
    assert.equal(second.updates.at(-1)?.processedRows, CSV_ROW_COUNT);
    assert.equal(second.hasClosed(), true);
  });

  it("closes a subscriber with no events when there is no active job", () => {
    const recorder = subscribeAndRecord();
    assert.equal(recorder.hasClosed(), true);
    assert.deepEqual(recorder.updates, []);
  });

  it("isolates jobs of different users", () => {
    const otherUser = createTestUserWithoutLinks();
    submitAccepted(CSV_TEXT);
    assert.equal(service.submit(otherUser.uuid, CSV_TEXT, false).ok, true);
  });
});

describe("import files with no importable rows", () => {
  it("accepts a file whose rows all fail and skips them per row", () => {
    const longKey = "k".repeat(KEY_MAX_LENGTH + 1);
    const invalidCsv = `${HEADER}\n,not-a-url,Invalid\n, ,Blank destination\n${longKey},https://example.com/ok,Bad key`;
    const job = submitAccepted(invalidCsv);
    assert.equal(job.totalRows, CSV_ROW_COUNT);
    const recorder = subscribeAndRecord();
    finishImport(CSV_ROW_COUNT);
    assert.deepEqual(recorder.updates.at(-1), {processedRows: CSV_ROW_COUNT, totalRows: CSV_ROW_COUNT});
    assert.equal(recorder.hasClosed(), true);
    assert.equal(user.state.links.length, 0);
    assert.equal(service.submit(user.uuid, CSV_TEXT, false).ok, true);
  });

  it("completes immediately when every row is blank", () => {
    const job = submitAccepted(`${HEADER}\n,,,\n , , `);
    assert.equal(job.totalRows, 0);
    assert.equal(job.status, "COMPLETED");
    assert.notEqual(job.completedTimestamp, null);
    const recorder = subscribeAndRecord();
    assert.equal(recorder.hasClosed(), true);
    assert.deepEqual(recorder.updates, []);
    assert.equal(service.submit(user.uuid, CSV_TEXT, false).ok, true);
  });
});

describe("import validation", () => {
  it("rejects files without a destination column", () => {
    const result = service.submit(user.uuid, "Short link,Title\nkey,Name", false);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, HTTP_BAD_REQUEST);
  });

  it("rejects a malformed header before scheduling a job", () => {
    assert.equal(service.submit(user.uuid, "wrong header\nvalue", false).ok, false);
  });

  it("rejects a file name that is too long and trims a padded one", () => {
    assert.equal(service.submit(user.uuid, CSV_TEXT, false, "x".repeat(MAX_FILE_NAME_LENGTH + 1)).ok, false);
    assert.equal(submitAccepted(CSV_TEXT, false, "  padded.csv  ").fileName, "padded.csv");
  });

  it("stores a blank file name as null", () => {
    assert.equal(submitAccepted(CSV_TEXT, false, "   ").fileName, null);
  });
});
