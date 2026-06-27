"use client";

import React, {useRef, useState} from "react";
import {Area, AreaChart, CartesianGrid, ReferenceArea, XAxis, YAxis} from "recharts";
import {ChartContainer, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {AnimatePresence, motion} from "framer-motion";
import {AnalyticsDailyClick} from "@/lib/store/analytics";
import {DateRange} from "react-day-picker";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";

interface ClicksTimeSeriesChartProps {
    timeSeries: AnalyticsDailyClick[];
    onZoom: (range: DateRange) => void;
}

interface DragState {
    startIndex: number;
    endIndex: number;
}

const LOW_CLICKS_THRESHOLD = 4;
const YAXIS_WIDTH = 40;

function formatYAxisTick(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
    return String(value);
}

function getIndexFromX(container: HTMLDivElement, clientX: number, dataLength: number): number {
    const rect = container.getBoundingClientRect();
    const plotWidth = rect.width - YAXIS_WIDTH;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left - YAXIS_WIDTH) / plotWidth));
    return Math.round(ratio * (dataLength - 1));
}

const chartConfig = {
    clicks: {
        label: "Clicks",
        color: "var(--chart-clicks)",
    },
};

export function ClicksTimeSeriesChart({timeSeries, onZoom}: ClicksTimeSeriesChartProps) {
    const isDesktop = useIsDesktop();

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
                        onZoom={onZoom}
                        dragEnabled={isDesktop}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

interface TimeSeriesAreaChartProps {
    timeSeries: AnalyticsDailyClick[];
    onZoom: (range: DateRange) => void;
    dragEnabled: boolean;
}

function TimeSeriesAreaChart({timeSeries, onZoom, dragEnabled}: TimeSeriesAreaChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [drag, setDrag] = useState<DragState | null>(null);

    const chartData = timeSeries.map((item) => {
        const d = new Date(item.date);
        return {
            date: d.toLocaleDateString(undefined, {month: "short", day: "numeric"}),
            rawDate: item.date,
            clicks: item.clicks,
        };
    });

    const maxClicks = Math.max(...chartData.map((d) => d.clicks), 0);

    const toIndex = (clientX: number) =>
        containerRef.current ? getIndexFromX(containerRef.current, clientX, chartData.length) : 0;

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!dragEnabled) return;
        const index = toIndex(e.clientX);
        setDrag({startIndex: index, endIndex: index});
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!drag || !dragEnabled) return;
        setDrag((prev) => prev ? {...prev, endIndex: toIndex(e.clientX)} : null);
    };

    const handleMouseUp = () => {
        if (!drag || !dragEnabled) return setDrag(null);

        const lo = Math.min(drag.startIndex, drag.endIndex);
        const hi = Math.max(drag.startIndex, drag.endIndex);
        setDrag(null);

        if (lo !== hi) {
            onZoom({from: new Date(chartData[lo].rawDate), to: new Date(chartData[hi].rawDate)});
        }
    };

    const lo = drag ? Math.min(drag.startIndex, drag.endIndex) : null;
    const hi = drag ? Math.max(drag.startIndex, drag.endIndex) : null;
    const refAreaX1 = lo !== null ? chartData[lo]?.date : undefined;
    const refAreaX2 = hi !== null ? chartData[hi]?.date : undefined;

    return (
        <motion.div
            key="chart"
            ref={containerRef}
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, scale: 0.98}}
            transition={{duration: 0.4}}
            className="w-full h-full select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setDrag(null)}
            style={{cursor: dragEnabled ? (drag ? "ew-resize" : "crosshair") : "default"}}
        >
            <ChartContainer config={chartConfig} className="w-full h-full min-h-62.5 pr-0">
                <AreaChart
                    accessibilityLayer
                    data={chartData}
                    margin={{top: 10, left: 0, right: 0, bottom: 0}}
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
                        width={YAXIS_WIDTH}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        allowDecimals={false}
                        domain={maxClicks <= LOW_CLICKS_THRESHOLD ? [0, Math.max(1, maxClicks)] : ["auto", "auto"]}
                        ticks={maxClicks <= LOW_CLICKS_THRESHOLD ? Array.from({length: Math.max(1, maxClicks) + 1}, (_, i) => i) : undefined}
                        tickFormatter={formatYAxisTick}
                    />
                    <ChartTooltip cursor={false} content={(props) => <ChartTooltipContent {...props}/>}/>
                    <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="var(--color-clicks)"
                        fill="url(#fillClicks)"
                        fillOpacity={1}
                        strokeWidth={2}
                    />
                    {refAreaX1 && refAreaX2 && refAreaX1 !== refAreaX2 && (
                        <ReferenceArea
                            x1={refAreaX1}
                            x2={refAreaX2}
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
