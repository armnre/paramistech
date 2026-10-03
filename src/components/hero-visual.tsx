import { Cloud, Smartphone, Sparkles } from 'lucide-react';

const branchPaths = [
  'M320 445 C267 419 229 389 204 350',
  'M316 394 C257 373 219 337 194 294',
  'M315 340 C260 319 229 282 214 239',
  'M316 285 C274 267 248 235 239 199',
  'M320 445 C371 418 409 385 435 344',
  'M316 394 C378 371 417 334 438 288',
  'M315 340 C372 317 404 278 420 234',
  'M316 285 C362 264 386 231 393 193',
];

const networkPaths = [
  'M204 350 C260 355 354 348 435 344',
  'M194 294 C255 306 350 301 438 288',
  'M214 239 C266 252 357 249 420 234',
  'M239 199 C285 217 348 211 393 193',
  'M204 350 C221 325 211 309 194 294',
  'M435 344 C420 322 423 306 438 288',
];

const nodes = [
  [320, 445, false],
  [316, 394, true],
  [315, 340, false],
  [316, 285, false],
  [204, 350, true],
  [194, 294, false],
  [214, 239, false],
  [239, 199, true],
  [435, 344, false],
  [438, 288, true],
  [420, 234, false],
  [393, 193, true],
  [321, 130, false],
] as const;

const chipStyles = [
  { className: 'hero-chip-mobile', Icon: Smartphone },
  { className: 'hero-chip-ai', Icon: Sparkles },
  { className: 'hero-chip-cloud', Icon: Cloud },
] as const;

export function HeroVisual({ label, chips }: { label: string; chips: string[] }) {
  return (
    <div className="hero-visual" role="img" aria-label={label}>
      <svg
        className="leaf-network"
        viewBox="0 0 640 640"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="leaf-stroke" x1="160" y1="520" x2="480" y2="100">
            <stop stopColor="#0F766E" />
            <stop offset="1" stopColor="#14B8A6" />
          </linearGradient>
          <linearGradient id="leaf-fill" x1="190" y1="500" x2="430" y2="130">
            <stop stopColor="#D5EEE9" stopOpacity="0.18" />
            <stop offset="0.55" stopColor="#D5EEE9" stopOpacity="0.58" />
            <stop offset="1" stopColor="#E6F4F1" stopOpacity="0.16" />
          </linearGradient>
          <radialGradient id="core-halo">
            <stop stopColor="#14B8A6" stopOpacity="0.13" />
            <stop offset="1" stopColor="#14B8A6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle className="leaf-halo" cx="320" cy="320" r="250" fill="url(#core-halo)" />
        <g className="leaf-orbits">
          <ellipse cx="320" cy="320" rx="272" ry="177" transform="rotate(-18 320 320)" />
          <ellipse cx="320" cy="320" rx="235" ry="235" />
          <ellipse cx="320" cy="320" rx="168" ry="286" transform="rotate(34 320 320)" />
        </g>

        <g className="leaf-shape" transform="rotate(-18 320 320)">
          <path
            className="leaf-draw leaf-outline"
            pathLength="1"
            d="M320 535 C211 480 164 348 190 250 C208 183 254 125 321 91 C386 132 433 190 449 258 C474 360 426 482 320 535Z"
            fill="url(#leaf-fill)"
          />
          <path
            className="leaf-draw leaf-midrib"
            pathLength="1"
            d="M320 535 C303 435 307 277 321 91"
          />
          {branchPaths.map((path) => (
            <path className="leaf-draw leaf-vein" pathLength="1" d={path} key={path} />
          ))}
          {networkPaths.map((path) => (
            <path className="leaf-draw leaf-link" pathLength="1" d={path} key={path} />
          ))}
          <g className="leaf-nodes">
            {nodes.map(([cx, cy, gold], index) => (
              <circle
                className={`leaf-node ${gold ? 'leaf-node-gold' : ''}`}
                cx={cx}
                cy={cy}
                r={gold ? 4.5 : 3.6}
                key={`${cx}-${cy}`}
                style={{
                  animationDelay: `${0.8 + index * 0.06}s, ${1.65 + index * 0.06}s`,
                }}
              />
            ))}
          </g>
        </g>

        <g className="orbit-cluster">
          <path className="leaf-draw leaf-link" pathLength="1" d="M99 240 L124 219 L150 231" />
          <circle className="leaf-node leaf-node-gold" cx="99" cy="240" r="4" />
          <circle className="leaf-node" cx="124" cy="219" r="3.5" />
          <circle className="leaf-node" cx="150" cy="231" r="3" />
        </g>
        <g className="orbit-cluster orbit-cluster-end">
          <path className="leaf-draw leaf-link" pathLength="1" d="M498 467 L523 446 L548 460" />
          <circle className="leaf-node" cx="498" cy="467" r="3.5" />
          <circle className="leaf-node leaf-node-gold" cx="523" cy="446" r="4" />
          <circle className="leaf-node" cx="548" cy="460" r="3" />
        </g>
      </svg>

      <div className="hero-visual-chips" aria-hidden="true">
        {chipStyles.map(({ className, Icon }, index) => (
          <span className={`hero-chip ${className}`} key={className}>
            <span className="hero-chip-icon">
              <Icon size={16} strokeWidth={1.7} />
            </span>
            {chips[index]}
          </span>
        ))}
      </div>
    </div>
  );
}
