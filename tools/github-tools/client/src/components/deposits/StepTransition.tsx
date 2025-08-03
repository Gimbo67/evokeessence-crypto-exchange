import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StepTransitionProps {
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
}

export function StepTransition({ children, isActive, className }: StepTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 30
            }
          }}
          exit={{ 
            opacity: 0, 
            y: -20, 
            scale: 0.95,
            transition: {
              duration: 0.2
            }
          }}
          className={cn("space-y-4", className)}
          role="group"
          aria-hidden={!isActive}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}