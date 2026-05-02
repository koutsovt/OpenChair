'use client';

import { Children } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedList({ children, className, delay = 0.05 }: AnimatedListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Children.map(children, (child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * delay }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
