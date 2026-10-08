import Link from "next/link";
import AkaraLogoImage from "@/public/logo.png";
import { joinClassNames } from "@/lib/frontendHelpers";
import Image from "next/image";

export function AkaraLogo({ className }: { className?: string }) {
    return (
        <Link href="/" aria-label="Akara Art — home" className={joinClassNames("inline-flex w-[120px] h-auto items-center transition-opacity hover:opacity-80", className)}>
            <Image src={AkaraLogoImage} width={1000} height={1000} alt="Akara Logo" loading="eager"></Image>
        </Link>
    );
}
