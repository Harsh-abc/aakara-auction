import React from "react";

interface CarouselSlideProps {
    children: React.ReactNode;
    className?: string;
}
const CarouselSlide: React.FC<CarouselSlideProps> = ({ children, className = "" }) => {
    return <div className={`embla__slide relative ${className}`}>{children}</div>;
};

export default CarouselSlide;