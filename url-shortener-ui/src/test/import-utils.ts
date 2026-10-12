import type {LinkImportJobDTO} from "@/lib/api-types";

export function createImportJob(): LinkImportJobDTO {
    return {
        id: "job-1", fileName: "links.csv", generateTakenKeys: false,
        processedRows: 0, totalRows: 10, succeededRows: 0, failedRows: 0, status: "QUEUED",
        createdTimestamp: "2026-10-04T12:00:00Z", startedTimestamp: null,
        completedTimestamp: null, expiresTimestamp: null,
    };
}
