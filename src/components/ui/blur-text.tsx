'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
}

export function BlurText({ text, delay = 100, className, animateBy = 'words' }: BlurTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const segments = animateBy === 'words' ? text.split(' ') : text.split('');

  return (
    <span ref={ref} className={cn('inline-flex flex-wrap', className)}>
      {segments.map((segment, i) => (
        <motion.span
          key={`${segment}-${i}`}
          initial={{ filter: 'blur(10px)', opacity: 0, y: -10 }}
          animate={
            inView
              ? { filter: 'blur(0px)', opacity: 1, y: 0 }
              : { filter: 'blur(10px)', opacity: 0, y: -10 }
          }
          transition={{
            duration: 0.35,
            delay: i * (delay / 1000),
          }}
          className="inline-block"
        >
          {segment}
          {animateBy === 'words' && i < segments.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  );
}
