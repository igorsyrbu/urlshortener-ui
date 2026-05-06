"use client";

import React from "react";
import {Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis} from "recharts";
import {ChartContainer, ChartTooltip} from "@/components/ui/chart";
import {motion} from "framer-motion";

interface BarChartDataItem {
    name: string;
    clicks: number;
    rawLabel: string;
    fill?: string;
}

interface BarLabelProps {
    x: number;
    y: number;
    width: number;
    height: number;
    value: string;
}

interface YAxisTickProps {
    y: number;
    payload: { value: string };
}

interface HorizontalBarChartProps {
    data: BarChartDataItem[];
    totalClicks: number;
    color: string;
    renderLabel: (props: BarLabelProps) => React.ReactNode;
}

const BAR_HEIGHT = 52;
const MIN_CHART_HEIGHT = 50;
const BAR_SIZE = 36;
const BAR_RADIUS = 6;

export type {BarLabelProps};

export function HorizontalBarChart({
                                       data,
                                       totalClicks,
                                       color,
                                       renderLabel,
                                   }: HorizontalBarChartProps) {
    if (!data || data.length === 0) return null;

    const maxDataValue = Math.max(totalClicks, 1);

    const chartConfig: Record<string, { label?: string; color?: string }> = {
        clicks: {label: "Clicks"},
        label: {color: "hsl(var(--background))"},
    };

    data.forEach((item) => {
        chartConfig[item.name] = {label: item.name, color};
    });

    const chartData = data.map((item) => ({...item, fill: color}));

    return (
        <div className="w-full pt-1 pb-1 flex flex-col justify-start min-h-37.5">
            <motion.div layout transition={{duration: 0.3}} className="w-full flex justify-start">
                <ChartContainer
                    config={chartConfig}
                    className="w-full -mt-3"
                    style={{height: Math.max(MIN_CHART_HEIGHT, data.length * BAR_HEIGHT)}}
                >
                    <BarChart
                        accessibilityLayer
                        data={chartData}
                        layout="vertical"
                        margin={{right: 80, left: 0, top: 0, bottom: 0}}
                    >
                        <CartesianGrid horizontal={false} vertical={false}/>
                        <YAxis yAxisId="left" dataKey="name" type="category" tickLine={false} axisLine={false} hide/>
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            width={80}
                            tick={({y, payload}: YAxisTickProps) => {
                                const item = chartData.find((d) => d.name === payload.value);
                                return (
                                    <text
                                        x="100%"
                                        dx={-12}
                                        y={y}
                                        className="fill-foreground font-medium tabular-nums"
                                        fontSize={14}
                                        textAnchor="end"
                                        dominantBaseline="central"
                                    >
                                        {item ? item.clicks.toLocaleString() : ""}
                                    </text>
                                );
                            }}
                        />
                        <XAxis dataKey="clicks" type="number" hide domain={[0, maxDataValue]}/>
                        <ChartTooltip
                            cursor={false}
                            content={({active, payload}) => {
                                if (!active || !payload || payload.length === 0) return null;

                                const payloadData = payload[0].payload;
                                const percentage =
                                    totalClicks > 0
                                        ? ((payloadData.clicks / totalClicks) * 100).toFixed(1)
                                        : "0";

                                return (
                                    <div
                                        className="bg-popover text-popover-foreground rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-[0.5px] border-border/40 p-2.5 pr-4 flex items-stretch gap-3 min-w-37.5">
                                        <div className="w-1.5 rounded-full shrink-0"
                                             style={{backgroundColor: payloadData.fill}}/>
                                        <div className="flex flex-col flex-1 gap-1">
                                            <span
                                                className="text-[13px] font-medium leading-none mb-1">{payloadData.name}</span>
                                            <div className="flex justify-between items-center w-full">
                                                <span className="text-[12px] text-muted-foreground mr-4">Clicks</span>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="text-[13px] font-bold tabular-nums">{payloadData.clicks.toLocaleString()}</span>
                                                    <span
                                                        className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md tabular-nums mt-0.5">{percentage}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }}
                        />
                        <Bar dataKey="clicks" layout="vertical" radius={BAR_RADIUS} barSize={BAR_SIZE} fillOpacity={1}
                             yAxisId="left">
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                    stroke={entry.fill}
                                    className="transition-all duration-300 [fill-opacity:0.4] stroke-0 dark:[fill-opacity:0.2] dark:stroke-[1px] dark:[stroke-opacity:0.7]"
                                />
                            ))}
                            {/* Recharts' LabelList content type is wider (optional string|number fields).
                                We cast here because our renderLabel expects concrete numbers, which Recharts
                                always provides in a horizontal bar layout. */}
                            <LabelList
                                dataKey="name"
                                content={(props) => renderLabel(props as unknown as BarLabelProps)}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </motion.div>
        </div>
    );
}
