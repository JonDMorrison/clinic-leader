import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export const AnimatedCounter = ({ value, duration = 1, className }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  useEffect(() => {
    spring.set(value);
    
    const unsubscribe = spring.on("change", (latest) => {
      setDisplayValue(Math.round(latest));
    });
    
    return () => unsubscribe();
  }, [value, spring]);

  return <span className={className}>{displayValue}</span>;
};
