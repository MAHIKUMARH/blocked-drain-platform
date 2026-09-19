"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main>
      <div
        className={cn(
          "relative flex h-[100vh] flex-col items-center justify-center bg-zinc-50 text-slate-950 transition-colors dark:bg-zinc-900",
          className,
        )}
        {...props}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={cn(
              "absolute -inset-[10px] pointer-events-none opacity-50 blur-[10px] will-change-transform [--aurora:repeating-linear-gradient(100deg,var(--primary)_10%,var(--accent)_20%,var(--chart-3)_30%,var(--chart-4)_40%,var(--primary)_50%)] [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)] [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)] [background-image:var(--white-gradient),var(--aurora)] [background-position:50%_50%,50%_50%] [background-size:300%,_200%] after:absolute after:inset-0 after:animate-aurora after:[background-attachment:fixed] after:[background-image:var(--white-gradient),var(--aurora)] after:[background-size:200%,_100%] after:mix-blend-difference after:content-[''] dark:[background-image:var(--dark-gradient),var(--aurora)] dark:after:[background-image:var(--dark-gradient),var(--aurora)] dark:invert-0 invert",
              showRadialGradient &&
                "[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]",
            )}
          />
        </div>
        {children}
      </div>
    </main>
  );
};
