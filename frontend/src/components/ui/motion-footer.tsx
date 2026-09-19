"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { ArrowUp, Heart, ShieldCheck } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { HoverHighlightText } from "@/components/ui/hover-highlight-text";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FOOTER_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.cinematic-footer-wrapper {
  --footer-surface: rgba(15, 30, 24, 0.78);
  --footer-border: color-mix(in srgb, var(--border) 70%, transparent);
  --footer-muted: var(--muted-foreground);
  font-family: 'Plus Jakarta Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-33.333%); }
}

.cinematic-footer-wrapper .animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 32s linear infinite;
}

.cinematic-footer-wrapper .footer-grid {
  background-size: 56px 56px;
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--primary) 12%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--primary) 12%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 25%, black 75%, transparent);
}

.cinematic-footer-wrapper .footer-glow {
  background: radial-gradient(circle, color-mix(in srgb, var(--primary) 22%, transparent), color-mix(in srgb, var(--accent) 12%, transparent) 42%, transparent 72%);
}

.cinematic-footer-wrapper .footer-pill {
  background: #14282d;
  border: 1px solid var(--footer-border);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24);
  transition: border-color 0.3s ease, background 0.3s ease;
}

.cinematic-footer-wrapper .footer-pill:hover {
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  border-color: color-mix(in srgb, var(--primary) 50%, transparent);
}

.cinematic-footer-wrapper .footer-wordmark {
  color: transparent;
  font-size: clamp(5rem, 18vw, 15rem);
  font-weight: 800;
  letter-spacing: -0.08em;
  line-height: 0.8;
  -webkit-text-stroke: 1px color-mix(in srgb, var(--primary) 20%, transparent);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), transparent 65%);
  background-clip: text;
  -webkit-background-clip: text;
}
`;

type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: "a" | "button";
  };

function MagneticButton({
  className,
  children,
  as = "button",
  ...props
}: MagneticButtonProps) {
  const localRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = localRef.current;
    if (!element) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      gsap.to(element, {
        x: x * 0.18,
        y: y * 0.18,
        rotationY: x * 0.04,
        rotationX: -y * 0.04,
        scale: 1.03,
        duration: 0.35,
        ease: "power2.out",
      });
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        rotationX: 0,
        rotationY: 0,
        scale: 1,
        duration: 0.7,
        ease: "elastic.out(1, 0.4)",
      });
    };

    element.addEventListener("mousemove", handleMouseMove);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mousemove", handleMouseMove);
      element.removeEventListener("mouseleave", handleMouseLeave);
      gsap.killTweensOf(element);
    };
  }, []);

  const Component = as;

  return (
    <Component
      ref={(node: HTMLButtonElement | HTMLAnchorElement | null) => {
        localRef.current = node as HTMLElement | null;
      }}
      className={cn("footer-pill cursor-pointer", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

const MarqueeItem = () => (
  <div className="flex items-center gap-10 px-6">
    <span>Report clearly</span>
    <span className="text-primary">✦</span>
    <span>Route accurately</span>
    <span className="text-primary">✦</span>
    <span>Resolve together</span>
    <span className="text-primary">✦</span>
  </div>
);

export function CinematicFooter() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    const context = gsap.context(() => {
      gsap.fromTo(
        wordmarkRef.current,
        { y: "12vh", opacity: 0, scale: 0.86 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 85%",
            end: "bottom bottom",
            scrub: 1,
          },
        },
      );

      gsap.fromTo(
        contentRef.current,
        { y: 45, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 65%",
            end: "top 25%",
            scrub: 1,
          },
        },
      );
    }, wrapperRef);

    return () => context.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: FOOTER_STYLES }} />
      <footer
        ref={wrapperRef}
        className="cinematic-footer-wrapper relative min-h-[680px] overflow-hidden border-t border-border/70 bg-background/90 text-foreground"
      >
        <div className="footer-glow absolute left-1/2 top-1/2 h-[55vh] w-[75vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]" />
        <div className="footer-grid pointer-events-none absolute inset-0" />

        <div className="absolute left-0 top-12 flex w-max animate-footer-scroll-marquee border-y border-border/70 bg-background/60 py-4 text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground backdrop-blur-md">
          <MarqueeItem />
          <MarqueeItem />
          <MarqueeItem />
        </div>

        <div
          ref={wordmarkRef}
          className="footer-wordmark pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 select-none whitespace-nowrap"
        >
          DRAINWATCH
        </div>

        <div
          ref={contentRef}
          className="relative z-10 mx-auto flex min-h-[680px] w-full max-w-5xl flex-col items-center justify-center px-6 pt-16 text-center"
        >
          <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary">
            <ShieldCheck size={16} />
            Civic action, made visible
          </div>
            <HoverHighlightText
              as="h2"
              text="Keep Kochi moving."
              baseClassName="footer-highlight-heading max-w-3xl text-5xl font-extrabold tracking-[-0.06em] md:text-8xl"
              highlightClassName="footer-highlight-heading max-w-3xl text-5xl font-extrabold tracking-[-0.06em] md:text-8xl"
              enableGlow
            />
          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            Every clear report helps the right team find the problem, protect the ward, and keep water flowing.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <MagneticButton
              as="a"
              href="#report-form"
              className="rounded-full px-8 py-4 text-sm font-bold text-white"
            >
              Report a blockage
            </MagneticButton>
            <MagneticButton
              as="a"
              href="#dashboard"
              className="rounded-full px-8 py-4 text-sm font-bold text-muted-foreground"
            >
              View the dashboard
            </MagneticButton>
          </div>

          <div className="mt-14 flex flex-col items-center gap-5 text-xs text-[#718078] md:flex-row">
            <span>DrainWatch · Kochi Municipal Corporation</span>
            <span className="hidden text-primary md:inline">✦</span>
            <span className="flex items-center gap-2">
              Built for public good <Heart size={13} className="text-primary" />
            </span>
            <MagneticButton
              onClick={scrollToTop}
              aria-label="Back to top"
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground"
            >
              <ArrowUp size={17} />
            </MagneticButton>
          </div>
        </div>
      </footer>
    </>
  );
}
