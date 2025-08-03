import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "./button";
import { Loader2, Check } from "lucide-react";
import { loadingSpinAnimation, successAnimation } from "@/lib/animation-utils";

interface AnimatedButtonProps extends ButtonProps {
  isLoading?: boolean;
  isSuccess?: boolean;
  loadingText?: string;
  successText?: string;
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    children, 
    className, 
    isLoading, 
    isSuccess, 
    loadingText, 
    successText,
    disabled,
    ...props 
  }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative",
          isSuccess && "bg-green-500 hover:bg-green-600",
          className
        )}
        {...props}
      >
        <motion.span
          animate={{
            opacity: isLoading || isSuccess ? 0 : 1,
            scale: isLoading || isSuccess ? 0.8 : 1
          }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.span>

        {isLoading && (
          <motion.span
            className="absolute inset-0 flex items-center justify-center"
            {...loadingSpinAnimation}
          >
            <Loader2 className="h-4 w-4 mr-2" />
            {loadingText}
          </motion.span>
        )}

        {isSuccess && (
          <motion.span
            className="absolute inset-0 flex items-center justify-center"
            {...successAnimation}
          >
            <Check className="h-4 w-4 mr-2" />
            {successText}
          </motion.span>
        )}
      </Button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton };
