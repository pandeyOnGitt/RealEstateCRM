import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/estatevoxa-logo.png"
      alt="EstateVoxa"
      width={320}
      height={80}
      priority={priority}
      className={cn("h-10 w-auto object-contain", className)}
    />
  );
}
