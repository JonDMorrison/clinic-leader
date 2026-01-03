import { motion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Calendar, Star, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProgressStats } from "@/hooks/useProgressStats";

interface HighlightCarouselProps {
  stats: ProgressStats;
}

interface HighlightSlide {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
  gradient: string;
}

export const HighlightCarousel = ({ stats }: HighlightCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    
    // Auto-play
    const autoplayInterval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => {
      emblaApi.off("select", onSelect);
      clearInterval(autoplayInterval);
    };
  }, [emblaApi]);

  const slides: HighlightSlide[] = [
    stats.topMonth && {
      icon: <Calendar className="w-8 h-8" />,
      title: "Best Month",
      value: stats.topMonth.month,
      description: `Your team's most productive month with ${stats.topMonth.score} accomplishments`,
      gradient: "from-brand to-accent",
    },
    stats.biggestImprovement && stats.biggestImprovement.percentChange > 0 && {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Biggest Improvement",
      value: `+${stats.biggestImprovement.percentChange}%`,
      description: `${stats.biggestImprovement.metric} grew the most this year`,
      gradient: "from-success to-brand",
    },
    stats.topCoreValue && {
      icon: <Star className="w-8 h-8" />,
      title: "Most Celebrated Value",
      value: stats.topCoreValue.name,
      description: `Recognized ${stats.topCoreValue.count} times this year`,
      gradient: "from-warning to-accent",
    },
    {
      icon: <Flame className="w-8 h-8" />,
      title: "Total Wins",
      value: `${stats.issuesSolved + stats.rocksCompleted + stats.milestonesHit}`,
      description: "Issues solved + Rocks completed + Milestones hit",
      gradient: "from-accent to-brand",
    },
  ].filter(Boolean) as HighlightSlide[];

  if (slides.length === 0) return null;

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <motion.div
              key={index}
              className="flex-[0_0_100%] min-w-0 p-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={cn(
                  "relative p-8 rounded-2xl bg-gradient-to-br text-white overflow-hidden",
                  slide.gradient
                )}
              >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                                     radial-gradient(circle at 80% 50%, white 1px, transparent 1px)`,
                    backgroundSize: "40px 40px",
                  }} />
                </div>

                <div className="relative z-10 flex flex-col items-center text-center gap-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="p-4 bg-white/20 rounded-full backdrop-blur-sm"
                  >
                    {slide.icon}
                  </motion.div>

                  <div>
                    <p className="text-sm font-medium text-white/80 uppercase tracking-wider">
                      {slide.title}
                    </p>
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl md:text-4xl font-bold mt-2"
                    >
                      {slide.value}
                    </motion.h3>
                    <p className="text-sm text-white/70 mt-2 max-w-xs mx-auto">
                      {slide.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={scrollPrev}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === selectedIndex
                  ? "bg-brand w-6"
                  : "bg-muted-foreground/30"
              )}
              onClick={() => emblaApi?.scrollTo(index)}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={scrollNext}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
