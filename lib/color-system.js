const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeHue = (value) => ((value % 360) + 360) % 360;

const parseHex = (value) => {
  const match = /^#([0-9a-f]{6})$/i.exec(String(value || ''));
  if (!match) return null;
  const number = Number.parseInt(match[1], 16);
  return {
    r: ((number >> 16) & 255) / 255,
    g: ((number >> 8) & 255) / 255,
    b: (number & 255) / 255,
  };
};

const toLinear = (value) => value <= 0.04045
  ? value / 12.92
  : ((value + 0.055) / 1.055) ** 2.4;

const toSrgb = (value) => value <= 0.0031308
  ? 12.92 * value
  : 1.055 * value ** (1 / 2.4) - 0.055;

const rgbToOklch = ({r, g, b}) => {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);
  const labL = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const labA = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const labB = 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;
  return {
    l: labL,
    c: Math.sqrt(labA ** 2 + labB ** 2),
    h: normalizeHue(Math.atan2(labB, labA) * 180 / Math.PI),
  };
};

const oklchToRgb = ({l, c, h}) => {
  const radians = normalizeHue(h) * Math.PI / 180;
  const a = c * Math.cos(radians);
  const b = c * Math.sin(radians);
  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b;
  const linearL = lRoot ** 3;
  const linearM = mRoot ** 3;
  const linearS = sRoot ** 3;
  return {
    r: toSrgb(4.0767416621 * linearL - 3.3077115913 * linearM + 0.2309699292 * linearS),
    g: toSrgb(-1.2684380046 * linearL + 2.6097574011 * linearM - 0.3413193965 * linearS),
    b: toSrgb(-0.0041960863 * linearL - 0.7034186147 * linearM + 1.707614701 * linearS),
  };
};

const inGamut = ({r, g, b}) => [r, g, b].every((value) => value >= 0 && value <= 1);

const channelToHex = (value) => Math.round(clamp(value, 0, 1) * 255)
  .toString(16)
  .padStart(2, '0');

const oklchToHex = (color) => {
  let chroma = Math.max(0, color.c);
  let rgb = oklchToRgb({...color, c: chroma});
  for (let index = 0; index < 28 && !inGamut(rgb); index += 1) {
    chroma *= 0.9;
    rgb = oklchToRgb({...color, c: chroma});
  }
  return `#${channelToHex(rgb.r)}${channelToHex(rgb.g)}${channelToHex(rgb.b)}`;
};

const relativeLuminance = (hex) => {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
};

export const contrastRatio = (first, second) => {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05);
};

const contrastRecipe = ({h, c}) => {
  if (c < 0.025) return {h: 108, l: 0.88, c: 0.17, strategy: '中性色 × 山葵荧光'};
  if (h >= 15 && h < 85) return {h: 245, l: 0.68, c: 0.18, strategy: '暖色 × 冷蓝'};
  if (h >= 85 && h < 170) return {h: 32, l: 0.7, c: 0.21, strategy: '绿调 × 柿橙'};
  if (h >= 170 && h < 265) return {h: 32, l: 0.7, c: 0.21, strategy: '冷蓝 × 柿橙'};
  if (h >= 265 && h < 330) return {h: 108, l: 0.86, c: 0.16, strategy: '紫调 × 山葵荧光'};
  return {h: 225, l: 0.7, c: 0.17, strategy: '红调 × 冰蓝'};
};

export const deriveCarouselPalette = (themeValue) => {
  const theme = parseHex(themeValue) ? String(themeValue).toLowerCase() : '#0055a5';
  const source = rgbToOklch(parseHex(theme));
  const contrast = contrastRecipe(source);
  const background = oklchToHex({
    l: source.l > 0.82 ? 0.2 : 0.17,
    c: clamp(source.c * 0.3, 0.018, 0.055),
    h: source.h,
  });
  const themeGlow = oklchToHex({
    l: clamp(source.l, 0.58, 0.72),
    c: clamp(source.c, 0.11, 0.21),
    h: source.h,
  });
  const contrastGlow = oklchToHex(contrast);
  const text = contrastRatio(background, '#f7f8f2') >= 4.5 ? '#f7f8f2' : '#10130e';

  return {
    theme,
    background,
    red: contrastGlow,
    blue: themeGlow,
    text,
    strategy: contrast.strategy,
    backgroundTextContrast: Number(contrastRatio(background, text).toFixed(2)),
  };
};
