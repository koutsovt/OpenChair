'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useInView } from 'motion/react';

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  className?: string;
  separator?: string;
  prefix?: string;
}

export function CountUp({
  to,
  from = 0,
  duration = 2,
  className,
  separator = ',',
  prefix = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(from);
  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);
  const springValue = useSpring(motionValue, { damping, stiffness });
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      motionValue.set(to);
    }
  }, [isInView, to, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (!ref.current) return;
      const formatted = new Intl.NumberFormat('en-AU', {
        useGrouping: separator !== '',
      }).format(Math.round(latest));
      ref.current.textContent = prefix + formatted;
    });
    return unsubscribe;
  }, [springValue, separator, prefix]);

  return <span ref={ref} className={className} />;
}
