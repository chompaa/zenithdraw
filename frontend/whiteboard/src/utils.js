export const clamp = (n, min, max) => {
  return Math.max(min, Math.min(n, max));
};

export const distance = (a, b) => {
  return Math.hypot(b.x - a.x, b.y - a.y);
};

export const squareDifferenceSum = (a, b) => {
  return Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2);
};
