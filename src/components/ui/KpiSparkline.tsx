import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

interface KpiSparklineProps {
  data?: number[];
  className?: string;
}

export const KpiSparkline = ({ data = [], className }: KpiSparklineProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const normalizedData = data.length > 0 ? data : [20, 30, 25, 40, 35, 50, 45];
  const max = Math.max(...normalizedData);
  const min = Math.min(...normalizedData);
  const range = max - min;

  // Create SVG path for line chart
  const width = 300;
  const height = 80;
  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = normalizedData.map((value, index) => {
    const x = padding + (index / (normalizedData.length - 1)) * chartWidth;
    const y = range > 0 
      ? padding + chartHeight - ((value - min) / range) * chartHeight
      : height / 2;
    return { x, y, value };
  });

  // Create path string
  const linePath = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
  ).join(' ');

  // Create gradient fill area
  const areaPath = `${linePath} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <div className={cn("relative h-24", className)}>
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + chartHeight * fraction}
            x2={width - padding}
            y2={padding + chartHeight * fraction}
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
            opacity="0.3"
            strokeDasharray="2,2"
          />
        ))}

        {/* Gradient definition */}
        <defs>
          <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity="0.05" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Area fill with animation */}
        <motion.path
          d={areaPath}
          fill="url(#sparkline-gradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Line path with animation */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="hsl(var(--brand))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        {/* Interactive dots */}
        {points.map((point, index) => (
          <g key={index}>
            <motion.circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 5 : 3}
              fill="hsl(var(--brand))"
              stroke="hsl(var(--background))"
              strokeWidth="2"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
              whileHover={{ scale: 1.3 }}
            />
            
            {/* Tooltip */}
            {hoveredIndex === index && (
              <g>
                <motion.rect
                  x={point.x - 25}
                  y={point.y - 35}
                  width="50"
                  height="24"
                  rx="4"
                  fill="hsl(var(--popover))"
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                />
                <motion.text
                  x={point.x}
                  y={point.y - 18}
                  textAnchor="middle"
                  fill="hsl(var(--popover-foreground))"
                  fontSize="12"
                  fontWeight="600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  {Math.round(point.value)}
                </motion.text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};
