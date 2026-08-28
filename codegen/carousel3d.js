const textEncoder = new TextEncoder();

const toSlug = (value) => {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return slug || 'carousel-3d-project';
};

const safeColor = (value, fallback) =>
  /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;

const clampNumber = (value, fallback, min, max, precision = 0) => {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : fallback;
  const clamped = Math.min(max, Math.max(min, safe));
  const factor = 10 ** precision;
  return Math.round(clamped * factor) / factor;
};

const extensionFor = (asset) => {
  const fromName = String(asset.name || '').match(/\.([a-zA-Z0-9]{2,5})$/)?.[1];
  if (fromName) return fromName.toLowerCase() === 'jpeg' ? 'jpg' : fromName.toLowerCase();
  if (asset.type === 'image/webp') return 'webp';
  if (asset.type === 'image/jpeg') return 'jpg';
  return 'png';
};

const asTextFile = (path, content) => ({path, data: textEncoder.encode(content), text: content});

const buildComponentSource = () => `import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type CardCarousel3DProps = {
  cardImages: string[];
  backgroundColor: string;
  redAccent: string;
  blueAccent: string;
  fitMode: 'contain' | 'cover';
  cardScale: number;
  cornerRadius: number;
  cameraTilt: number;
  direction: 'clockwise' | 'counterclockwise';
  ringRadius: number;
  perspective: number;
  startCard: number;
};

const CARD_WIDTH = 400;
const CARD_HEIGHT = 700;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const faceStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  background: '#031435',
  boxShadow:
    '0 30px 78px rgba(0,0,0,.58), 0 0 0 1px rgba(190,225,255,.55), inset 0 1px 0 rgba(255,255,255,.55)',
};

const CardFace: React.FC<{
  src: string;
  back?: boolean;
  brightness: number;
  saturation: number;
  opacity: number;
  fitMode: 'contain' | 'cover';
  cornerRadius: number;
}> = ({src, back = false, brightness, saturation, opacity, fitMode, cornerRadius}) => (
  <div
    style={{
      ...faceStyle,
      borderRadius: cornerRadius,
      transform: back ? 'rotateY(180deg)' : undefined,
      filter: \`brightness(\${brightness}) saturate(\${saturation})\`,
      opacity,
    }}
  >
    <Img
      src={staticFile(src)}
      style={{width: '100%', height: '100%', objectFit: fitMode, display: 'block'}}
    />
  </div>
);

export const CardCarousel3D: React.FC<CardCarousel3DProps> = ({
  cardImages,
  backgroundColor,
  redAccent,
  blueAccent,
  fitMode,
  cardScale,
  cornerRadius,
  cameraTilt,
  direction,
  ringRadius,
  perspective,
  startCard,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const t = Math.min(1, frame / Math.max(1, durationInFrames - 1));
  const directionMultiplier = direction === 'clockwise' ? 1 : -1;
  const startAngle = -(startCard * 360) / Math.max(1, cardImages.length);
  const spin = startAngle + directionMultiplier * t * 360;
  const cardWidth = CARD_WIDTH * cardScale;
  const cardHeight = CARD_HEIGHT * cardScale;
  const lightPulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
  const horizonShift = interpolate(lightPulse, [0, 1], [-32, 32]);

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        background: \`radial-gradient(ellipse at 50% 43%, \${blueAccent} 0%, \${backgroundColor} 42%, #01030b 100%)\`,
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.7,
          background: [
            \`radial-gradient(circle at 12% 34%, \${redAccent}77, transparent 23%)\`,
            \`radial-gradient(circle at 88% 32%, \${blueAccent}88, transparent 27%)\`,
            'linear-gradient(112deg, transparent 28%, rgba(255,255,255,.035) 48%, transparent 68%)',
          ].join(','),
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 350,
          width: 1260,
          height: 3,
          transform: \`translateX(calc(-50% + \${horizonShift}px))\`,
          background: \`linear-gradient(90deg, transparent, \${redAccent} 22%, rgba(235,244,255,.95) 50%, \${blueAccent} 78%, transparent)\`,
          boxShadow: \`0 0 34px \${blueAccent}99\`,
          opacity: 0.42,
        }}
      />

      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', perspective}}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '47%',
            width: 0,
            height: 0,
            transformStyle: 'preserve-3d',
            transform: \`translateZ(-250px) rotateX(\${cameraTilt}deg) translateY(-30px)\`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              transformStyle: 'preserve-3d',
              transform: \`rotateY(\${spin}deg)\`,
            }}
          >
            {cardImages.map((src, index) => {
              const baseAngle = (index * 360) / cardImages.length;
              const worldAngle = ((baseAngle + spin) * Math.PI) / 180;
              const depth = clamp01((Math.cos(worldAngle) + 1) / 2);
              const brightness = 0.54 + depth * 0.58;
              const saturation = 0.72 + depth * 0.34;
              const opacity = 0.28 + depth * 0.72;

              return (
                <div
                  key={src}
                  style={{
                    position: 'absolute',
                    left: -cardWidth / 2,
                    top: -cardHeight / 2,
                    width: cardWidth,
                    height: cardHeight,
                    transformStyle: 'preserve-3d',
                    transform: \`rotateY(\${baseAngle}deg) translateZ(\${ringRadius}px)\`,
                  }}
                >
                  <CardFace src={src} brightness={brightness} saturation={saturation} opacity={opacity} fitMode={fitMode} cornerRadius={cornerRadius} />
                  <CardFace src={src} back brightness={brightness} saturation={saturation} opacity={opacity} fitMode={fitMode} cornerRadius={cornerRadius} />
                </div>
              );
            })}
          </div>

          <div
            style={{
              position: 'absolute',
              left: -600,
              top: 390,
              width: 1200,
              height: 1200,
              borderRadius: '50%',
              transform: 'rotateX(90deg)',
              background: \`radial-gradient(circle, \${blueAccent}33 0%, \${blueAccent}14 38%, transparent 66%)\`,
              boxShadow: \`inset 0 0 120px \${blueAccent}22\`,
            }}
          />
        </div>
      </div>

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 50%, transparent 43%, rgba(0,3,13,.22) 72%, rgba(0,0,0,.72) 100%)',
          boxShadow: 'inset 0 0 150px rgba(0,0,0,.58)',
        }}
      />
    </AbsoluteFill>
  );
};
`;

const buildRootSource = ({cardPaths, colors, visual, motion, durationInFrames}) => `import React from 'react';
import {Composition} from 'remotion';
import {CardCarousel3D, type CardCarousel3DProps} from './CardCarousel3D';

const defaultProps: CardCarousel3DProps = {
  cardImages: ${JSON.stringify(cardPaths, null, 2)},
  backgroundColor: ${JSON.stringify(colors.background)},
  redAccent: ${JSON.stringify(colors.red)},
  blueAccent: ${JSON.stringify(colors.blue)},
  fitMode: ${JSON.stringify(visual.fitMode)},
  cardScale: ${visual.cardScale},
  cornerRadius: ${visual.cornerRadius},
  cameraTilt: ${visual.cameraTilt},
  direction: ${JSON.stringify(motion.direction)},
  ringRadius: ${motion.radius},
  perspective: ${motion.perspective},
  startCard: ${motion.startCard},
};

export const VideoRoot: React.FC = () => (
  <Composition
    id="Carousel3D"
    component={CardCarousel3D}
    durationInFrames={${durationInFrames}}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={defaultProps}
  />
);
`;

const buildReadme = ({projectName, assetCount, colors, palette, visual, motion, durationInFrames}) => `# ${projectName}

This Remotion project was generated locally from the Video Shotcraft \`carousel-3d\` template.

## Included

- ${assetCount} card images in \`public/cards/\`
- Parameterized \`CardCarousel3D\` component
- 1080x1920, 30fps, ${durationInFrames} frames (${motion.durationSeconds} seconds)
- Deterministic full-loop motion: the first and final frame coincide

## Selected controls

- Cards: ${assetCount} (derived from uploaded images)
- Direction: ${motion.direction}
- Full-loop duration: ${motion.durationSeconds} seconds
- Start card: ${motion.startCard + 1}
- Ring radius / perspective: ${motion.radius}px / ${motion.perspective}px
- Image fit / card scale / corner radius: ${visual.fitMode} / ${visual.cardScale} / ${visual.cornerRadius}px
- Camera tilt: ${visual.cameraTilt} degrees
- Theme / background / contrast glow / theme glow: ${colors.theme} / ${colors.background} / ${colors.red} / ${colors.blue}
- Palette strategy: ${palette.strategy}${palette.manualOverrides.length ? ` (manual overrides: ${palette.manualOverrides.join(', ')})` : ''}

## Run locally

\`\`\`powershell
npm install
npm run start
\`\`\`

Open the Remotion Studio and select the \`Carousel3D\` composition.

## Render the video yourself

\`\`\`powershell
npm run render
\`\`\`

The generated MP4 is written to \`out/carousel-3d.mp4\`.

The generator does not render, upload, or publish video. Rendering occurs only when you run the command above in your own environment.

## Attribution

Motion structure adapted from Video Shotcraft under Apache-2.0. See \`NOTICE.md\` and \`LICENSE.upstream.txt\`.
`;

export function buildCarouselProject({projectName, colors, visual, motion, assets, licenseText}) {
  if (!Array.isArray(assets) || assets.length < 3 || assets.length > 8) {
    throw new Error('Carousel 3D requires between 3 and 8 card images.');
  }

  const safeProjectName = String(projectName || 'Carousel 3D Project').trim() || 'Carousel 3D Project';
  const slug = toSlug(safeProjectName);
  const safeColors = {
    theme: safeColor(colors?.theme, '#0055a5'),
    background: safeColor(colors?.background, '#071d49'),
    red: safeColor(colors?.red, '#ed174c'),
    blue: safeColor(colors?.blue, '#0055a5'),
    text: safeColor(colors?.text, '#f7f8f2'),
  };
  const safePalette = {
    strategy: String(colors?.strategy || '主题色 × 自动撞色').trim().slice(0, 80) || '主题色 × 自动撞色',
    backgroundTextContrast: clampNumber(colors?.backgroundTextContrast, 4.5, 1, 21, 2),
    manualOverrides: ['background', 'red', 'blue'].filter((field) => colors?.overrides?.[field] === true),
  };
  const safeVisual = {
    fitMode: visual?.fitMode === 'cover' ? 'cover' : 'contain',
    cardScale: clampNumber(visual?.cardScale, 1, 0.7, 1.2, 2),
    cornerRadius: clampNumber(visual?.cornerRadius, 30, 0, 48),
    cameraTilt: clampNumber(visual?.cameraTilt, -7, -14, 4),
  };
  const safeMotion = {
    direction: motion?.direction === 'counterclockwise' ? 'counterclockwise' : 'clockwise',
    durationSeconds: clampNumber(motion?.durationSeconds, 5.6, 3, 12, 1),
    radius: clampNumber(motion?.radius, 400, 280, 560),
    perspective: clampNumber(motion?.perspective, 1550, 1000, 2200),
    startCard: clampNumber(motion?.startCard, 0, 0, assets.length - 1),
  };
  const durationInFrames = Math.round(safeMotion.durationSeconds * 30);
  const motionManifest = {
    ...safeMotion,
    speedDegreesPerSecond: Math.round(360 / safeMotion.durationSeconds),
  };

  const normalizedAssets = assets.map((asset, index) => {
    const fileName = `card-${String(index + 1).padStart(2, '0')}.${extensionFor(asset)}`;
    return {...asset, fileName, path: `public/cards/${fileName}`};
  });
  const cardPaths = normalizedAssets.map((asset) => `cards/${asset.fileName}`);

  const packageJson = {
    name: slug,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      start: 'remotion studio src/index.ts',
      typecheck: 'tsc --noEmit',
      still: 'remotion still src/index.ts Carousel3D out/preview.png --frame=63',
      render: 'remotion render src/index.ts Carousel3D out/carousel-3d.mp4 --codec=h264 --crf=15 --pixel-format=yuv420p',
    },
    dependencies: {
      '@remotion/cli': '4.0.484',
      react: '19.2.7',
      'react-dom': '19.2.7',
      remotion: '4.0.484',
    },
    devDependencies: {
      '@types/react': '19.2.17',
      typescript: '6.0.3',
    },
  };

  const files = [
    asTextFile('package.json', `${JSON.stringify(packageJson, null, 2)}\n`),
    asTextFile('tsconfig.json', `${JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        lib: ['DOM', 'ES2022'],
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: ['react'],
      },
      include: ['src/**/*.ts', 'src/**/*.tsx'],
    }, null, 2)}\n`),
    asTextFile('src/index.ts', "import {registerRoot} from 'remotion';\nimport {VideoRoot} from './Root';\n\nregisterRoot(VideoRoot);\n"),
    asTextFile('src/Root.tsx', buildRootSource({
      cardPaths,
      colors: safeColors,
      visual: safeVisual,
      motion: safeMotion,
      durationInFrames,
    })),
    asTextFile('src/CardCarousel3D.tsx', buildComponentSource()),
    asTextFile('README.md', buildReadme({
      projectName: safeProjectName,
      assetCount: assets.length,
      colors: safeColors,
      palette: safePalette,
      visual: safeVisual,
      motion: safeMotion,
      durationInFrames,
    })),
    asTextFile('NOTICE.md', 'Generated from the Video Shotcraft carousel-3d reference implementation.\nUpstream: https://github.com/Vincentwei1021/video-shotcraft\nLicense: Apache-2.0\n'),
    asTextFile('LICENSE.upstream.txt', String(licenseText || 'Apache License 2.0 - see https://www.apache.org/licenses/LICENSE-2.0')),
    asTextFile('project-manifest.json', `${JSON.stringify({
      generator: 'video-shotcraft-local-library',
      template: 'carousel-3d',
      projectName: safeProjectName,
      cardCount: assets.length,
      cards: cardPaths,
      colors: safeColors,
      palette: safePalette,
      visual: safeVisual,
      motion: motionManifest,
      output: {width: 1080, height: 1920, fps: 30, durationInFrames},
    }, null, 2)}\n`),
  ];

  for (const asset of normalizedAssets) {
    files.push({path: asset.path, data: asset.data, text: null});
  }

  return {name: slug, files};
}
