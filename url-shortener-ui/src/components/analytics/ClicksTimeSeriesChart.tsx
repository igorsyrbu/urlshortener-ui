"use client";

import {useState} from "react";
import {Area, AreaChart, CartesianGrid, ReferenceArea, XAxis, YAxis} from "recharts";
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {AnimatePresence, motion} from "framer-motion";
import {AnalyticsDailyClick} from "@/lib/store/analytics";
import {DateRange} from "react-day-picker";

interface ClicksTimeSeriesChartProps {
    timeSeries: AnalyticsDailyClick[];
    onZoom: (range: DateRange) => void;
}

interface RefAreaPoint {
    formatted: string;
    raw: string;
}

interface RechartsMouseEvent {
    activeLabel?: string;
    activePayload?: { payload: { rawDate: string } }[];
}

const LOW_CLICKS_THRESHOLD = 4;

function formatYAxisTick(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
    return String(value);
}

const chartConfig = {
    clicks: {
        label: "Clicks",
        color: "var(--chart-clicks)",
    },
};

export function ClicksTimeSeriesChart({timeSeries, onZoom}: ClicksTimeSeriesChartProps) {
    const [refAreaLeft, setRefAreaLeft] = useState<RefAreaPoint | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<RefAreaPoint | null>(null);

    const handleZoom = () => {
        if (!refAreaLeft || !refAreaRight || refAreaLeft.raw === refAreaRight.raw) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        const date1 = new Date(refAreaLeft.raw);
        const date2 = new Date(refAreaRight.raw);

        const startDate = date1 < date2 ? date1 : date2;
        const endDate = date1 < date2 ? date2 : date1;

        onZoom({from: startDate, to: endDate});
        setRefAreaLeft(null);
        setRefAreaRight(null);
    };

    const handleMouseDown = (e: RechartsMouseEvent) => {
        if (e?.activeLabel && e?.activePayload?.length) {
            setRefAreaLeft({formatted: e.activeLabel, raw: e.activePayload[0].payload.rawDate});
        }
    };

    const handleMouseMove = (e: RechartsMouseEvent) => {
        if (refAreaLeft && e?.activeLabel && e?.activePayload?.length) {
            setRefAreaRight({formatted: e.activeLabel, raw: e.activePayload[0].payload.rawDate});
        }
    };

    return (
        <div className="h-80 sm:h-96 mt-4 relative w-full">
            <AnimatePresence mode="wait">
                {(!timeSeries || timeSeries.length === 0) ? (
                    <motion.div
                        key="loading"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        exit={{opacity: 0}}
                        className="absolute inset-0 flex items-center justify-center border-b border-border/50"
                    >
                        <p className="text-sm text-muted-foreground">Gathering chart data...</p>
                    </motion.div>
                ) : (
                    <TimeSeriesAreaChart
                        timeSeries={timeSeries}
                        refAreaLeft={refAreaLeft}
                        refAreaRight={refAreaRight}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleZoom}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

interface TimeSeriesAreaChartProps {
    timeSeries: AnalyticsDailyClick[];
    refAreaLeft: RefAreaPoint | null;
    refAreaRight: RefAreaPoint | null;
    onMouseDown: (e: RechartsMouseEvent) => void;
    onMouseMove: (e: RechartsMouseEvent) => void;
    onMouseUp: () => void;
}

function TimeSeriesAreaChart({
                                 timeSeries,
                                 refAreaLeft,
                                 refAreaRight,
                                 onMouseDown,
                                 onMouseMove,
                                 onMouseUp,
                             }: TimeSeriesAreaChartProps) {
    const chartData = timeSeries.map((item) => {
        const d = new Date(item.date);
        return {
            date: d.toLocaleDateString(undefined, {month: "short", day: "numeric"}),
            rawDate: item.date,
            clicks: item.clicks,
        };
    });

    const maxClicks = Math.max(...chartData.map((d) => d.clicks), 0);

    return (
        <motion.div
            key="chart"
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, scale: 0.98}}
            transition={{duration: 0.4}}
            className="w-full h-full"
        >
            <ChartContainer config={chartConfig} className="w-full h-full min-h-62.5 pr-0">
                <AreaChart
                    accessibilityLayer
                    data={chartData}
                    margin={{top: 10, left: 0, right: 0, bottom: 0}}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    className="select-none"
                    style={{cursor: refAreaLeft ? "ew-resize" : "crosshair"}}
                >
                    <defs>
                        <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-clicks)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--color-clicks)" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}/>
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        allowDecimals={false}
                        domain={maxClicks <= LOW_CLICKS_THRESHOLD ? [0, Math.max(1, maxClicks)] : ["auto", "auto"]}
                        ticks={maxClicks <= LOW_CLICKS_THRESHOLD ? Array.from({length: Math.max(1, maxClicks) + 1}, (_, i) => i) : undefined}
                        tickFormatter={formatYAxisTick}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent/>}/>
                    <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="var(--color-clicks)"
                        fill="url(#fillClicks)"
                        fillOpacity={1}
                        strokeWidth={2}
                    />
                    {refAreaLeft && refAreaRight && (
                        <ReferenceArea
                            x1={refAreaLeft.formatted}
                            x2={refAreaRight.formatted}
                            strokeOpacity={0.3}
                            fill="hsl(var(--primary))"
                            fillOpacity={0.15}
                        />
                    )}
                </AreaChart>
            </ChartContainer>
        </motion.div>
    );
}
