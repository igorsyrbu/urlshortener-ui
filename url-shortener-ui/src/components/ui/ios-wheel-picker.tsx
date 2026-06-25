"use client";

import React, {useCallback, useEffect, useRef} from "react";
import {EmblaCarouselType} from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import {cn} from "@/lib/utils";

const CIRCLE_DEGREES = 360;
const WHEEL_ITEM_SIZE = 36;
const WHEEL_ITEM_COUNT = 18;
const WHEEL_ITEMS_IN_VIEW = 4;

export const WHEEL_ITEM_RADIUS = CIRCLE_DEGREES / WHEEL_ITEM_COUNT;
export const IN_VIEW_DEGREES = WHEEL_ITEM_RADIUS * WHEEL_ITEMS_IN_VIEW;
export const WHEEL_RADIUS = Math.round(
    WHEEL_ITEM_SIZE / 2 / Math.tan(Math.PI / WHEEL_ITEM_COUNT)
);

const isInView = (wheelLocation: number, slidePosition: number): boolean =>
    Math.abs(wheelLocation - slidePosition) < IN_VIEW_DEGREES;

const setSlideStyles = (
    emblaApi: EmblaCarouselType,
    index: number,
    loop: boolean,
    slideCount: number,
    totalRadius: number
): void => {
    const slideNode = emblaApi.slideNodes()[index];
    if (!slideNode) return;

    const snapList = emblaApi.scrollSnapList();
    if (snapList.length === 0) return;

    const wheelLocation = emblaApi.scrollProgress() * totalRadius;
    const positionDefault = snapList[index] * totalRadius;
    const positionLoopStart = positionDefault + totalRadius;
    const positionLoopEnd = positionDefault - totalRadius;

    let inView = isInView(wheelLocation, positionDefault);
    let angle = index * -WHEEL_ITEM_RADIUS;

    if (loop && isInView(wheelLocation, positionLoopEnd)) {
        inView = true;
        angle = -CIRCLE_DEGREES + (slideCount - index) * WHEEL_ITEM_RADIUS;
    }

    if (loop && isInView(wheelLocation, positionLoopStart)) {
        inView = true;
        angle = -(totalRadius % CIRCLE_DEGREES) - index * WHEEL_ITEM_RADIUS;
    }

    if (inView) {
        slideNode.style.opacity = "1";
        slideNode.style.transform = `translateY(-${index * 100}%) rotateX(${angle}deg) translateZ(${WHEEL_RADIUS}px)`;
    } else {
        slideNode.style.opacity = "0";
        slideNode.style.transform = "none";
    }
};

const setContainerStyles = (
    emblaApi: EmblaCarouselType,
    wheelRotation: number
): void => {
    emblaApi.containerNode().style.transform = `translateZ(${WHEEL_RADIUS}px) rotateX(${wheelRotation}deg)`;
};

export interface WheelPickerItem {
    label: string;
    disabled?: boolean;
}

interface IosWheelPickerProps {
    items: WheelPickerItem[];
    selectedIndex: number;
    onChange: (index: number) => void;
    perspective?: "left" | "right";
    loop?: boolean;
    className?: string;
}

export function IosWheelPicker({
                                    items,
                                    selectedIndex,
                                    onChange,
                                    perspective = "left",
                                    loop = false,
                                    className,
                                }: IosWheelPickerProps) {
    const initialIndexRef = useRef(
        Math.min(selectedIndex, Math.max(items.length - 1, 0))
    );

    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop,
        axis: "y",
        dragFree: true,
        containScroll: false,
        startIndex: initialIndexRef.current,
    });

    const slideCount = items.length;
    const totalRadius = slideCount * WHEEL_ITEM_RADIUS;
    const rotationOffset = loop ? 0 : WHEEL_ITEM_RADIUS;

    const inactivateEmblaTransform = useCallback(
        (emblaApi: EmblaCarouselType) => {
            if (!emblaApi) return;

            const engine = emblaApi.internalEngine();
            engine.translate.clear();
            engine.translate.toggleActive(false);

            const loopPoints = engine.slideLooper.loopPoints;
            loopPoints.forEach((lp) => {
                lp.translate.clear();
                lp.translate.toggleActive(false);
            });
        },
        []
    );

    const rotateWheel = useCallback(
        (emblaApi: EmblaCarouselType) => {
            const rotation = totalRadius - rotationOffset;
            const wheelRotation = rotation * emblaApi.scrollProgress();
            setContainerStyles(emblaApi, wheelRotation);
            emblaApi.slideNodes().forEach((_, index) => {
                setSlideStyles(emblaApi, index, loop, slideCount, totalRadius);
            });
        },
        [totalRadius, rotationOffset, slideCount, loop]
    );

    useEffect(() => {
        if (!emblaApi) return;

        emblaApi.on("pointerUp", (api) => {
            const engine = api.internalEngine();
            const targetValue = engine.target.get();
            const locationValue = engine.location.get();
            const displacement = targetValue - locationValue;
            const factor = Math.abs(displacement) < WHEEL_ITEM_SIZE / 2.5 ? 10 : 0.1;
            const distance = displacement * factor;
            engine.scrollTo.distance(distance, true);
        });

        emblaApi.on("scroll", rotateWheel);

        emblaApi.on("reInit", (api) => {
            inactivateEmblaTransform(api);
            rotateWheel(api);
        });

        inactivateEmblaTransform(emblaApi);
        rotateWheel(emblaApi);
    }, [emblaApi, inactivateEmblaTransform, rotateWheel]);

    useEffect(() => {
        if (!emblaApi || items.length === 0) return;

        const currentSnap = emblaApi.selectedScrollSnap();
        if (currentSnap !== selectedIndex) {
            requestAnimationFrame(() => {
                emblaApi.scrollTo(selectedIndex, false);
            });
        }
    }, [emblaApi, selectedIndex, items.length]);

    useEffect(() => {
        if (!emblaApi) return;

        const onSelect = () => {
            const snapIndex = emblaApi.selectedScrollSnap();
            onChange(snapIndex);
        };

        emblaApi.on("select", onSelect);
        return () => {
            emblaApi.off("select", onSelect);
        };
    }, [emblaApi, onChange]);

    return (
        <div className={cn("ios-wheel-picker", className)}>
            <div className="ios-wheel-picker__scene">
                <div
                    className={cn(
                        "ios-wheel-picker__viewport",
                        perspective === "left"
                            ? "ios-wheel-picker__viewport--perspective-left"
                            : "ios-wheel-picker__viewport--perspective-right"
                    )}
                    ref={emblaRef}
                >
                    <div className="ios-wheel-picker__container">
                        {items.map((item, index) => (
                            <div
                                className="ios-wheel-picker__slide"
                                key={`${item.label}-${index}`}
                            >
                                {item.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}