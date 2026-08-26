"use client"

import Carousel from "@/components/common/Carousel/Carousel"
import CarouselSlide from "@/components/common/Carousel/CarouselSlide"
import { SignupForm } from "@/components/core/auth/signup-form"
import loginImages from "@/public"
import Image from "next/image"


export default function SignupPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:block h-svh">
        <Carousel
          options={{ loop: true }}
          showButtons={false}
          showDots={true}
          autoplay={true}
          autoplayDelay={3000}
          className="h-full w-full"
        >
          {loginImages.slice(0, 6).map((image, index) => (
            <CarouselSlide key={index} className="h-full w-full relative">
              <Image
                src={image}
                alt={`slide-${index}`}
                fill
                className="object-cover"
                priority={index === 0}
              />
            </CarouselSlide>
          ))}
        </Carousel>
      </div>
      <div className="flex flex-col  gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <SignupForm />
          </div>
        </div>
      </div>

    </div>
  )
}
