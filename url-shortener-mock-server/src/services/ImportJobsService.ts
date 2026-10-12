import {randomUUID} from "node:crypto";
import {shortLinksService, type PreparedCsvImport} from "./ShortLinksService";

export interface ImportProgress {
  processedRows: number;
  totalRows: number;
}

export interface LinkImportJob extends ImportProgress {
  id: string;
  fileName: string | null;
  generateTakenKeys: boolean;
  succeededRows: number;
  failedRows: number;
  status: "QUEUED" | "PROCESSING" | "COMPLETED";
  createdTimestamp: string;
  startedTimestamp: string | null;
  completedTimestamp: string | null;
  expiresTimestamp: string | null;
}

type ImportSubmission = {ok: true; job: LinkImportJob} | {ok: false; status: number; error: string};

interface ProgressSubscriber {
  onProgress: (progress: ImportProgress) => void;
  onClose: () => void;
}

const ROW_DELAY_MS = 100;
const MAX_FILE_NAME_LENGTH = 255;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNPROCESSABLE_ENTITY = 422;
const UNKNOWN_FAILURE_REASON = "The row could not be imported.";

export class ImportJobsService {
  private jobs = new Map<string, LinkImportJob>();
  private subscribers = new Map<string, Set<ProgressSubscriber>>();

  submit(userId: string, csvText: string, generateTakenKeys: boolean, fileName?: string): ImportSubmission {
    if (this.getActiveJob(userId)) {
      return {ok: false, status: HTTP_UNPROCESSABLE_ENTITY, error: "An import job is already ongoing for this user"};
    }
    const sanitizedName = fileName?.trim() || null;
    if (sanitizedName && sanitizedName.length > MAX_FILE_NAME_LENGTH) {
      return {ok: false, status: HTTP_BAD_REQUEST, error: `File name exceeds the maximum length of ${MAX_FILE_NAME_LENGTH} characters`};
    }
    const prepared = shortLinksService.prepareCsvImport(csvText);
    if (!prepared.ok) return {...prepared, status: HTTP_BAD_REQUEST};
    const job = this.createJob(prepared.input.rows.length, generateTakenKeys, sanitizedName);
    this.jobs.set(userId, job);
    if (job.totalRows === 0) {
      // Nothing to process (e.g. every row was blank): finish immediately
      // instead of scheduling a timer that would never terminate.
      const timestamp = new Date().toISOString();
      job.status = "COMPLETED";
      job.startedTimestamp = timestamp;
      job.completedTimestamp = timestamp;
      return {ok: true, job: {...job}};
    }
    this.scheduleRows(userId, job, prepared.input);
    return {ok: true, job: {...job}};
  }

  subscribe(userId: string, subscriber: ProgressSubscriber): () => void {
    const job = this.getActiveJob(userId);
    if (!job) {
      subscriber.onClose();
      return () => undefined;
    }
    let subscribers = this.subscribers.get(userId);
    if (!subscribers) {
      subscribers = new Set();
      this.subscribers.set(userId, subscribers);
    }
    subscribers.add(subscriber);
    subscriber.onProgress({processedRows: job.processedRows, totalRows: job.totalRows});
    return () => {
      this.removeSubscriber(userId, subscriber);
    };
  }

  private getActiveJob(userId: string): LinkImportJob | undefined {
    const job = this.jobs.get(userId);
    return job?.status !== "COMPLETED" ? job : undefined;
  }

  private createJob(totalRows: number, generateTakenKeys: boolean, fileName: string | null): LinkImportJob {
    return {
      id: randomUUID(), fileName, generateTakenKeys, totalRows, processedRows: 0,
      succeededRows: 0, failedRows: 0, status: "QUEUED",
      createdTimestamp: new Date().toISOString(), startedTimestamp: null,
      completedTimestamp: null, expiresTimestamp: null,
    };
  }

  private scheduleRows(userId: string, job: LinkImportJob, input: PreparedCsvImport): void {
    const timer = setInterval(() => {
      this.processRow(userId, job, input);
      if (job.status === "COMPLETED") clearInterval(timer);
    }, ROW_DELAY_MS);
    timer.unref();
  }

  private processRow(userId: string, job: LinkImportJob, input: PreparedCsvImport): void {
    job.status = "PROCESSING";
    job.startedTimestamp ??= new Date().toISOString();
    let failure: string | null;
    try {
      failure = shortLinksService.importCsvRow(userId, input.rows[job.processedRows], input.columns, job.generateTakenKeys)?.reason ?? null;
    } catch {
      failure = UNKNOWN_FAILURE_REASON;
    }
    if (failure) job.failedRows++;
    else job.succeededRows++;
    job.processedRows++;
    if (job.processedRows === job.totalRows) {
      job.status = "COMPLETED";
      job.completedTimestamp = new Date().toISOString();
    }
    this.publishProgress(userId, job);
  }

  private publishProgress(userId: string, job: LinkImportJob): void {
    const subscribers = this.subscribers.get(userId);
    if (!subscribers || subscribers.size === 0) return;
    const progress = {processedRows: job.processedRows, totalRows: job.totalRows};
    for (const subscriber of [...subscribers]) {
      subscriber.onProgress(progress);
    }
    if (job.status === "COMPLETED") {
      this.subscribers.delete(userId);
      for (const subscriber of [...subscribers]) {
        subscriber.onClose();
      }
    }
  }

  private removeSubscriber(userId: string, subscriber: ProgressSubscriber): void {
    const subscribers = this.subscribers.get(userId);
    if (!subscribers) return;
    subscribers.delete(subscriber);
    if (subscribers.size === 0) this.subscribers.delete(userId);
  }
}

export const importJobsService = new ImportJobsService();
