import { useEffect, useState, useCallback, useRef } from "react";

interface TypewriterRotateProps {
  phrases: string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseMs?: number;
  pauseAfterDeleteMs?: number;
  className?: string;
}

export const TypewriterRotate = ({
  phrases,
  typeSpeed = 55,
  deleteSpeed = 35,
  pauseMs = 1000,
  pauseAfterDeleteMs = 250,
  className,
}: TypewriterRotateProps) => {
  const [displayed, setDisplayed] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const prefersReduced = useRef(false);

  useEffect(() => {
    prefersReduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const tick = useCallback(() => {
    const current = phrases[phraseIndex];

    if (!isDeleting) {
      // Typing
      if (displayed.length < current.length) {
        return setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), typeSpeed);
      }
      // Fully typed — pause then start deleting
      return setTimeout(() => setIsDeleting(true), pauseMs);
    }

    // Deleting
    if (displayed.length > 0) {
      return setTimeout(() => setDisplayed(current.slice(0, displayed.length - 1)), deleteSpeed);
    }
    // Fully deleted — pause then move to next phrase
    return setTimeout(() => {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, pauseAfterDeleteMs);
  }, [displayed, phraseIndex, isDeleting, phrases, typeSpeed, deleteSpeed, pauseMs, pauseAfterDeleteMs]);

  useEffect(() => {
    if (prefersReduced.current) return;
    const timer = tick();
    return () => clearTimeout(timer);
  }, [tick]);

  // Longest phrase for min-width stability
  const maxLen = Math.max(...phrases.map((p) => p.length));

  // Screen-reader-only full text
  const srText = `Turn your clinic data into ${phrases.join(", ")}.`;

  if (prefersReduced.current) {
    return <span className={className}>{phrases[0]}</span>;
  }

  return (
    <>
      <span className="sr-only">{srText}</span>
      <span
        aria-hidden="true"
        className={className}
        style={{ display: "inline-block", minWidth: `${maxLen}ch` }}
      >
        {displayed}
        <span className="animate-blink ml-[1px] font-light">|</span>
      </span>
    </>
  );
};
