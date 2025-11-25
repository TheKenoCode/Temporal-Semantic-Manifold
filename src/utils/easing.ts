/**
 * Easing functions for smooth animations
 */

export const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export const easeOutQuad = (t: number): number => {
  return 1 - (1 - t) * (1 - t);
};

export const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

/**
 * Smooth step function (smoother than linear, less aggressive than cubic)
 */
export const smoothstep = (t: number): number => {
  return t * t * (3 - 2 * t);
};

/**
 * Extra smooth step (even smoother)
 */
export const smootherstep = (t: number): number => {
  return t * t * t * (t * (t * 6 - 15) + 10);
};

