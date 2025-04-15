import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Loader2 } from "lucide-react";

export default function PageTransition({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((prevProgress) => 
        prevProgress < 100 ? prevProgress + 10 : 100
      );
    }, 60);

    const timer = setTimeout(() => {
      setIsLoading(false);
      clearInterval(progressTimer);
    }, 600);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, []);

  const pageVariants = {
    initial: {
      opacity: 0,
      y: 40,
      scale: 0.98,
      filter: 'blur(12px)'
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 18,
        mass: 1.1,
        duration: 0.3
      }
    },
    exit: {
      opacity: 0,
      y: -40,
      scale: 0.98,
      filter: 'blur(12px)',
      transition: {
        duration: 0.15
      }
    }
  };

  return (
    <div className="relative w-full min-h-[200px]">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <div className="fixed inset-0 bg-transparent z-50 flex flex-col items-center justify-center">
            {/* Top Progress Bar */}
            <div className="fixed top-0 left-0 w-full h-0.5 bg-neutral-900">
              <div
                className="h-full bg-white transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <Loader2 className="h-10 w-10 text-white animate-spin" />
          </div>
        ) : (
          <motion.div
            key="content"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className="w-full"
            style={{
              transformOrigin: 'center',
              willChange: 'transform, opacity, filter'
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}