import { MotionProps } from "framer-motion";

export const fadeIn: MotionProps = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

export const scaleIn: MotionProps = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.95, opacity: 0 },
  transition: { duration: 0.2 }
};

export const slideInFromRight: MotionProps = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 20, opacity: 0 },
  transition: { duration: 0.3, ease: "easeOut" }
};

export const pulseAnimation: MotionProps = {
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 0.3,
      ease: "easeInOut",
      repeat: Infinity
    }
  }
};

export const buttonTapAnimation: MotionProps = {
  whileTap: { scale: 0.97 },
  whileHover: { scale: 1.02 },
  transition: { duration: 0.2 }
};

export const loadingSpinAnimation: MotionProps = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: "linear",
      repeat: Infinity
    }
  }
};

export const successAnimation: MotionProps = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: { duration: 0.4 }
  }
};

export const cardHoverAnimation: MotionProps = {
  whileHover: {
    y: -4,
    transition: { duration: 0.2 }
  }
};

export const listItemAnimation = (index: number): MotionProps => ({
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { delay: index * 0.1, duration: 0.2 }
});