'use client';

import { useRef } from 'react';
import { useMotionValue, useAnimationFrame, useTransform, motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface ShinyTextProps {
  text: string;
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
}

export function ShinyText({
  text,
  speed = 2,
  className,
  color = '#b5b5b5a0',
  shineColor = '#ffffff',
}: ShinyTextProps) {
  const progress = useMotionValue(0);
  const maskPosition = useTransform(progress, (v) => `${(v % 200) - 50}%`);
  const startTime = useRef<number | null>(null);

  useAnimationFrame((t) => {
    if (startTime.current === null) startTime.current = t;
    const elapsed = (t - startTime.current) / 1000;
    progress.set(elapsed * speed * 30);
  });

  return (
    <motion.span
      className={cn('inline-block', className)}
      style={{
        color,
        backgroundImage: `linear-gradient(90deg, transparent, ${shineColor}, transparent)`,
        backgroundSize: '50% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: color,
        backgroundPositionX: maskPosition,
      }}
    >
      {text}
    </motion.span>
  );
}
