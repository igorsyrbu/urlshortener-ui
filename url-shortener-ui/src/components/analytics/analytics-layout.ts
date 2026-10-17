/**
 * Layout classes shared by the analytics page, its cards and the loading skeleton, so the skeleton has the loaded
 * page's exact geometry and nothing moves when the data arrives.
 */
export const ANALYTICS_PERIOD_ROW_CLASS = "flex min-h-10 items-center justify-end gap-3";
export const ANALYTICS_SUMMARY_CARD_CLASS = "flex flex-col gap-6 rounded-xl border-[0.5px] border-border bg-card p-4 sm:p-6";
export const ANALYTICS_GRID_CLASS = "md:mt-2 grid grid-cols-1 gap-y-4 md:gap-y-6 gap-x-4 md:grid-cols-2 md:gap-x-5";
export const ANALYTICS_CARD_CLASS = "flex flex-col rounded-xl border-[0.5px] border-border bg-card p-4 sm:p-6";
export const ANALYTICS_CARD_HEADER_CLASS = "mb-6 flex items-center justify-between border-b-[0.5px] border-border pb-2";
/** Height of a five-bar chart (5 x 52 px bars, minus the chart's -12 px offset, plus 8 px padding). */
export const ANALYTICS_CARD_BODY_HEIGHT_CLASS = "h-64";
