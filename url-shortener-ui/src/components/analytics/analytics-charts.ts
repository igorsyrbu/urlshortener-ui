// The one module both lazy charts load from: two separate dynamic imports of recharts components made Turbopack emit
// recharts into two chunks, and the page downloaded both.
export {ClicksTimeSeriesChart} from "@/components/analytics/ClicksTimeSeriesChart";
export {HorizontalBarChart} from "@/components/analytics/HorizontalBarChart";
