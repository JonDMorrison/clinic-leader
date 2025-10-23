import { motion } from "framer-motion";

interface OverlayProps {
  onClick?: () => void;
}

export const Overlay = ({ onClick }: OverlayProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999]"
      onClick={onClick}
    />
  );
};
