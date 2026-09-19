"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type SpringOptions,
} from "framer-motion";
import { cn } from "@/lib/utils";

type HoverHighlightTextElement = "h1" | "h2" | "p" | "span";

export type HoverHighlightTextProps = {
  text: string;
  as?: HoverHighlightTextElement;
  baseClassName?: string;
  highlightClassName?: string;
  containerClassName?: string;
  spotlightRadius?: number;
  spotlightSoftness?: number;
  baseColor?: string;
  highlightColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  enableGlow?: boolean;
  springConfig?: SpringOptions;
  disabled?: boolean;
};

const DEFAULT_SPRING: SpringOptions = {
  stiffness: 150,
  damping: 24,
  mass: 0.6,
};

export function HoverHighlightText({
  text,
  as = "h2",
  baseClassName,
  highlightClassName,
  containerClassName,
  spotlightRadius = 118,
  spotlightSoftness = 0.82,
  baseColor,
  highlightColor,
  strokeColor,
  strokeWidth = 1,
  enableGlow = false,
  springConfig,
  disabled = false,
}: HoverHighlightTextProps) {
  const reduceMotion = useReducedMotion() === true;
  const [active, setActive] = React.useState(false);
  const [touched, setTouched] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, springConfig ?? DEFAULT_SPRING);
  const smoothY = useSpring(y, springConfig ?? DEFAULT_SPRING);
  const safeRadius = Math.max(48, spotlightRadius);
  const safeSoftness = Math.min(0.95, Math.max(0.45, spotlightSoftness));
  const solidStop = Math.round(safeSoftness * 48);
  const fadeStop = Math.round(safeSoftness * 100);
  const maskImage = useMotionTemplate`radial-gradient(${safeRadius}px circle at ${smoothX}px ${smoothY}px, black 0%, black ${solidStop}%, transparent ${fadeStop}%)`;
  const glow = useMotionTemplate`radial-gradient(${safeRadius * 1.15}px circle at ${smoothX}px ${smoothY}px, color-mix(in srgb, var(--primary) 24%, transparent), transparent 72%)`;
  const Tag = as;
  const showReveal = !disabled && (active || touched);
  const staticReveal = reduceMotion && !disabled;

  function updatePointer(clientX: number, clientY: number) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    x.set(clientX - rect.left);
    y.set(clientY - rect.top);
  }

  return (
    <div
      ref={ref}
      onPointerEnter={(event) => {
        if (disabled || reduceMotion) return;
        setActive(true);
        setTouched(false);
        updatePointer(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (disabled || reduceMotion) return;
        updatePointer(event.clientX, event.clientY);
      }}
      onPointerLeave={() => setActive(false)}
      onPointerDown={(event) => {
        if (disabled || reduceMotion) return;
        setTouched(true);
        updatePointer(event.clientX, event.clientY);
      }}
      className={cn("relative inline-block max-w-full overflow-visible", containerClassName)}
    >
      <Tag
        className={cn("select-none text-balance", baseClassName)}
        style={{ color: baseColor }}
      >
        {text}
      </Tag>

      {enableGlow && !disabled ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[-1.5rem] -z-10 rounded-[2rem]"
          style={{ backgroundImage: glow }}
          animate={{ opacity: showReveal && !reduceMotion ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      ) : null}

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={
          staticReveal
            ? undefined
            : { WebkitMaskImage: maskImage, maskImage }
        }
        animate={{
          opacity: staticReveal ? 0.32 : showReveal ? 1 : 0,
          scale: staticReveal || showReveal ? 1 : 0.98,
        }}
        transition={{ duration: reduceMotion ? 0.08 : 0.28, ease: "easeOut" }}
      >
        <Tag
          className={cn("select-none text-balance text-transparent", highlightClassName)}
          style={{
            color: highlightColor,
            WebkitTextStroke: `${strokeWidth}px ${strokeColor ?? "rgba(255,255,255,0.64)"}`,
            textShadow: "0 0 1px rgba(255,255,255,0.36)",
          }}
        >
          {text}
        </Tag>
      </motion.div>
    </div>
  );
}

export default HoverHighlightText;
