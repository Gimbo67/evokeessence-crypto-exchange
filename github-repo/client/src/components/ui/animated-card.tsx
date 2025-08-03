import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { cardHoverAnimation } from "@/lib/animation-utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

export const AnimatedCard = motion(Card);
export const AnimatedCardHeader = motion(CardHeader);
export const AnimatedCardContent = motion(CardContent);
export const AnimatedCardFooter = motion(CardFooter);
export const AnimatedCardTitle = motion(CardTitle);
export const AnimatedCardDescription = motion(CardDescription);

// Preset card animations
export const HoverCard = ({ children, className, ...props }: React.ComponentProps<typeof Card>) => (
  <AnimatedCard
    className={cn("transition-colors hover:border-primary/50", className)}
    {...cardHoverAnimation}
    {...props}
  >
    {children}
  </AnimatedCard>
);

export const PulseCard = ({ children, className, ...props }: React.ComponentProps<typeof Card>) => (
  <AnimatedCard
    className={cn("transition-all", className)}
    animate={{
      scale: [1, 1.02, 1],
      transition: { duration: 0.3, ease: "easeInOut" }
    }}
    {...props}
  >
    {children}
  </AnimatedCard>
);
