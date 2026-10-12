// ---------------------------------------------------------------------------
// Import / export labels — single source of truth for the links options menu,
// the import/export modals, and the CSV dropzone.
// ---------------------------------------------------------------------------

export const IMPORT_FROM_CSV_LABEL = "Import links from CSV";
export const EXPORT_AS_CSV_LABEL = "Export links as CSV";

export const IMPORT_MODAL_TITLE = "Import Links From a CSV File";
export const IMPORT_MODAL_SR_DESCRIPTION = "Dialog to import links from a CSV file";

export const DROPZONE_HINT = "Click or drag and drop a CSV file.";
export const DROPZONE_HINT_ACTIVE = "Drop the file to import.";
export const DROPZONE_ARIA_LABEL = "CSV file dropzone";
export const CSV_ACCEPT = ".csv,text/csv";

export const CANCEL_LABEL = "Cancel";
export const IMPORT_LABEL = "Import";
export const IMPORTING_LABEL = "Importing...";
export const DONE_LABEL = "Done";
export const IMPORT_MORE_LABEL = "Import more";
export const EXPORT_LABEL = "Export";
export const EXPORTING_LABEL = "Exporting...";

export const EXPORT_MODAL_TITLE = "Export links as CSV";
export const EXPORT_MODAL_SR_DESCRIPTION = "Dialog to export links as a CSV file";
export const INCLUDE_FILTERS_LABEL = "Apply current filters";
export const EXPORT_FILTERED_HINT = "Only links matching the current search and filters will be exported.";
export const APPLY_FILTERS_TOOLTIP =
    "When enabled, the export includes only links matching your current search query and the “Show archived links” setting";

export const IMPORT_SUCCESS_TITLE = "Import complete";
export const IMPORT_NO_FAILURES_HINT = "All rows were imported successfully.";
export const GENERATE_TAKEN_KEYS_LABEL = "Generate new keys for taken ones";
export const GENERATE_TAKEN_KEYS_HINT =
    "When a short key is already taken, the link is created with a newly generated key instead of being skipped.";

export function buildImportSummaryMessage(imported: number, failedCount: number): string {
    const linkWord = imported === 1 ? "link" : "links";
    if (failedCount === 0) {
        return `${imported} ${linkWord} imported.`;
    }
    const rowWord = failedCount === 1 ? "row" : "rows";
    return `${imported} ${linkWord} imported, ${failedCount} ${rowWord} failed.`;
}

export const RESULTS_SHORT_LINK_COLUMN = "Short link";
export const RESULTS_DESTINATION_COLUMN = "Destination URL";
export const RESULTS_REASON_COLUMN = "Reason";

export const IMPORT_EMPTY_FILE_MESSAGE = "The selected file is empty. Choose a CSV file with a header row and at least one link.";

export function buildTooManyRowsMessage(limit: number): string {
    return `The selected file exceeds the maximum of ${limit} links per import. Split it into smaller files and try again.`;
}

export const IMPORT_FAILED_MESSAGE = "Import failed. Please try again.";
export const IMPORT_PROGRESS_ARIA_LABEL = "Import progress";
export const VIEW_IMPORT_PROGRESS_LABEL = "View import progress";
export const IMPORT_PROGRESS_TITLE = "Importing links…";
export const IMPORT_PROCESSED_TITLE = "Processing complete";
export const IMPORT_PROGRESS_UNAVAILABLE_TITLE = "Progress updates unavailable";
export const IMPORT_PROGRESS_UNAVAILABLE_HINT = "The import may still be running or may have finished. Refresh your links to see the latest results.";
export const IMPORT_PROCESSING_HINT = "You can close this window. Your import will continue in the background.";
export const IMPORT_PROCESSED_HINT = "All rows have been processed. Check your links for the imported results.";
export const REFRESH_LINKS_LABEL = "Refresh links";
export const CLOSE_LABEL = "Close";

export function buildImportProgressMessage(processedRows: number, totalRows: number): string {
    return `${processedRows} of ${totalRows} rows processed`;
}
export const EXPORT_SUCCESS_MESSAGE = "Links exported successfully.";
export const EXPORT_FAILED_MESSAGE = "Export failed. Please try again.";
export const EXPORT_RATE_LIMITED_MESSAGE = "Export is rate limited. Please wait a moment and try again.";
