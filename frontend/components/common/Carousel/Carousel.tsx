import React, { useCallback, useEffect, useState, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import type { EmblaOptionsType } from "embla-carousel";

interface CarouselProps {
    children: React.ReactNode;
    options?: EmblaOptionsType;
    showButtons?: boolean;
    showDots?: boolean;
    className?: string;
    autoplay?: boolean;
    autoplayDelay?: number;
}

const Carousel: React.FC<CarouselProps> = ({
    children,
    options = {},
    showButtons = true,
    showDots = true,
    className = "",
    autoplay = true,
    autoplayDelay = 3000,
}) => {
    const autoplayPlugin = useRef(
        Autoplay({ delay: autoplayDelay, stopOnInteraction: false, stopOnMouseEnter: true })
    );

    const [emblaRef, emblaApi] = useEmblaCarousel(
        options,
        autoplay ? [autoplayPlugin.current] : []
    );

    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
    const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;

        setScrollSnaps(emblaApi.scrollSnapList());
        onSelect();

        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);

        return () => {
            emblaApi.off("select", onSelect);
            emblaApi.off("reInit", onSelect);
        };
    }, [emblaApi, onSelect]);

    return (
        <div className={`embla ${className}`}>
            <div className="embla__viewport h-full" ref={emblaRef}>
                <div className="embla__container h-full">
                    {children}
                </div>
            </div>

            {showButtons && (
                <div className="embla__buttons">
                    <button type="button" className="embla__prev" onClick={scrollPrev} aria-label="Previous slide">
                        Prev
                    </button>
                    <button type="button" className="embla__next" onClick={scrollNext} aria-label="Next slide">
                        Next
                    </button>
                </div>
            )}

            {showDots && scrollSnaps.length > 0 && (
                <div className="embla__dots">
                    {scrollSnaps.map((_, index) => (
                        <button
                            key={index}
                            type="button"
                            className={`embla__dot ${index === selectedIndex ? "embla__dot--active" : ""}`}
                            onClick={() => scrollTo(index)}
                            aria-label={`Go to slide ${index + 1}`}
                            aria-current={index === selectedIndex ? "true" : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Carousel;