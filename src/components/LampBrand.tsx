"use client";

import React from "react";

interface LampMarkProps {
  className?: string;
}

/**
 * Crisp vector Open Bible & Rising Flame emblem (Option 2).
 * Uses currentColor for the book pages (adapts cleanly to Light & Dark mode)
 * and burnished gold for the rising flame.
 */
export function LampMark({ className = "w-10 h-8" }: LampMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 104"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M62.6 8.5C65.6 15.2 78.2 26.6 79.3 40.4C80.3 52.6 73.4 61.7 64 66C54.6 61.7 47.6 52.3 49.1 40.1C50.4 29.6 60.3 20.8 62.6 8.5ZM64 36C60 42.8 56.9 48.2 57.8 54.5C58.6 59.6 61.8 63.1 64 65.1C66.2 63.1 69.4 59.6 70.2 54.5C71.1 48.2 68 42.8 64 36Z"
        className="fill-[#A67628] dark:fill-[#E5B863]"
      />
      <path
        d="M49.2 40.2C41.8 37.6 33.8 36.7 26.6 37.2L11 67.2C27.8 67.4 45.5 73.1 64 86.5C82.5 73.1 100.2 67.4 117 67.2L101.4 37.2C94.2 36.7 86.2 37.6 78.8 40.2L80.4 43.6C86.2 42.3 92.1 42.2 97.5 43.1L108 62.5C93 63.7 77.4 68.7 64 79.7C50.6 68.7 35 63.7 20 62.5L30.5 43.1C35.9 42.2 41.8 42.3 47.6 43.6L49.2 40.2Z"
        fill="currentColor"
      />
      <path
        d="M12.5 72.9C30 72.9 47.8 78.6 60.8 90.6C62.6 92.3 65.4 92.3 67.2 90.6C80.2 78.6 98 72.9 115.5 72.9L119.6 80.9C101.4 80.9 83.8 85.9 71.3 96.1C67 99.6 61 99.6 56.7 96.1C44.2 85.9 26.6 80.9 8.4 80.9L12.5 72.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

interface LampTitleLockupProps {
  size?: "sm" | "md" | "lg";
  subtitle?: string;
}

export function LampTitleLockup({
  size = "md",
  subtitle = "BIBLE STUDY & WORD NOTES",
}: LampTitleLockupProps) {
  const sizes = {
    sm: {
      mark: "w-9 h-7",
      title: "text-2xl",
      sub: "text-[9px] tracking-[0.16em]",
      gap: "gap-2",
    },
    md: {
      mark: "w-11 h-9",
      title: "text-3xl",
      sub: "text-[9.5px] tracking-[0.17em]",
      gap: "gap-2.5",
    },
    lg: {
      mark: "w-14 h-12",
      title: "text-4xl",
      sub: "text-[10.5px] tracking-[0.2em]",
      gap: "gap-3",
    },
  }[size];

  return (
    <div className={`inline-flex items-center ${sizes.gap} select-none`}>
      <LampMark className={`${sizes.mark} text-[#1C1917] dark:text-[#F5F0E8] shrink-0`} />
      <div className="leading-none">
        <span
          className={`font-serif ${sizes.title} font-semibold tracking-tight block text-[#1C1917] dark:text-[#F5F0E8]`}
        >
          Lamp
        </span>
        {subtitle && (
          <span
            className={`${sizes.sub} font-semibold uppercase text-[#8C6221] dark:text-[#DFB164] block mt-0.5`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
