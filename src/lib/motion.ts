import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion language — fast, smooth, natural (Apple / Linear / Arc).
 * Motion improves usability; it never decorates.
 */

export const spring: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 };
export const springSnappy: Transition = { type: "spring", stiffness: 560, damping: 38, mass: 0.7 };
export const springGentle: Transition = { type: "spring", stiffness: 260, damping: 30 };

export const easeOut: Transition = { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...spring, delay: i * 0.04 },
  }),
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: easeOut },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: spring },
};

export const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } },
};

/** Press feedback for primary interactive elements. */
export const pressable = {
  whileTap: { scale: 0.975 },
  transition: springSnappy,
};
