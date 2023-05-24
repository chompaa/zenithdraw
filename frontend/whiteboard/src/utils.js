// https://stackoverflow.com/questions/19799777/how-to-add-transparency-information-to-a-hex-color-code
export const addAlpha = (color, opacity) => {
  // coerce values so ti is between 0 and 1.
  var _opacity = Math.round(Math.min(Math.max(opacity || 1, 0), 1) * 255);
  return color + _opacity.toString(16).toUpperCase();
};

export const clamp = (n, min, max) => {
  return Math.max(min, Math.min(n, max));
};

export const distance = (a, b) => {
  return Math.hypot(b.x - a.x, b.y - a.y);
};
