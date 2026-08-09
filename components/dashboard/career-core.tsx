"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

export type CareerCoreApplication = {
  id: string;
  status: string;
};

type OrbitLevel = "outer" | "middle" | "inner";

type OrbitConfig = {
  level: OrbitLevel;
  rx: number;
  ry: number;
  depth: number;
  nodeColor: string;
  nodeSize: number;
  nodeOpacity: number;
  strokeFront: string;
  strokeRear: string;
  widthFront: number;
  widthRear: number;
  opacityFront: number;
  opacityRear: number;
  glow: boolean;
  spin: number;
};

const OUTER_STATUSES = new Set(["APPLIED", "HR_REPLIED"]);
const MIDDLE_STATUSES = new Set(["HR_CALL"]);
const INNER_STATUSES = new Set(["TECH_INTERVIEW", "TEST_TASK"]);
const MILESTONE_STATUS = "OFFER";

const MAX_NODES = 12;
const PARTICLE_COUNT = 7;
const FRAGMENT_COUNT = 6;

const ORBITS: Record<OrbitLevel, OrbitConfig> = {
  outer: {
    level: "outer",
    rx: 108,
    ry: 37,
    depth: -34,
    nodeColor: "var(--gh-node-early)",
    nodeSize: 5,
    nodeOpacity: 0.45,
    strokeFront: "var(--gh-orbit-rear)",
    strokeRear: "var(--gh-orbit-rear)",
    widthFront: 1.5,
    widthRear: 1,
    opacityFront: 0.55,
    opacityRear: 0.25,
    glow: false,
    spin: 168,
  },
  middle: {
    level: "middle",
    rx: 78,
    ry: 27,
    depth: 0,
    nodeColor: "var(--gh-node-interview)",
    nodeSize: 7,
    nodeOpacity: 0.85,
    strokeFront: "var(--gh-ring-mid)",
    strokeRear: "var(--gh-ring-mid)",
    widthFront: 2,
    widthRear: 1.25,
    opacityFront: 0.75,
    opacityRear: 0.32,
    glow: false,
    spin: 132,
  },
  inner: {
    level: "inner",
    rx: 50,
    ry: 18,
    depth: 30,
    nodeColor: "var(--gh-node-advanced)",
    nodeSize: 8,
    nodeOpacity: 1,
    strokeFront: "var(--gh-orbit-front)",
    strokeRear: "var(--gh-orbit-front)",
    widthFront: 2.75,
    widthRear: 1.5,
    opacityFront: 0.95,
    opacityRear: 0.4,
    glow: true,
    spin: 96,
  },
};

const CORE_SIZE = "clamp(13rem, 15vw, 16.5rem)";

const FACETS = [
  {
    id: "top-right",
    clipPath: "polygon(50% 50%, 50% 4%, 88% 30%)",
    translateZ: 24,
    rotateY: -6,
    rotateZ: -2,
    gradient:
      "linear-gradient(135deg, var(--gh-core-facet-front), var(--gh-core-facet-front-dim))",
    opacity: 0.97,
  },
  {
    id: "upper-left",
    clipPath: "polygon(50% 50%, 16% 26%, 50% 4%)",
    translateZ: 16,
    rotateY: -12,
    rotateZ: 3,
    gradient:
      "linear-gradient(150deg, var(--gh-core-facet-front-dim), var(--gh-core-facet-rear-dim))",
    opacity: 0.92,
  },
  {
    id: "right",
    clipPath: "polygon(50% 50%, 88% 30%, 82% 78%)",
    translateZ: 2,
    rotateY: 9,
    rotateZ: -3,
    gradient:
      "linear-gradient(120deg, var(--gh-core-facet-front-dim), var(--gh-core-facet-rear))",
    opacity: 0.86,
  },
  {
    id: "lower-left",
    clipPath: "polygon(50% 50%, 12% 76%, 16% 26%)",
    translateZ: -5,
    rotateY: -5,
    rotateZ: 2,
    gradient:
      "linear-gradient(160deg, var(--gh-core-facet-rear-dim), var(--gh-core-facet-rear))",
    opacity: 0.84,
  },
  {
    id: "lower-right",
    clipPath: "polygon(50% 50%, 82% 78%, 46% 97%)",
    translateZ: -19,
    rotateY: 11,
    rotateZ: -4,
    gradient: "linear-gradient(140deg, var(--gh-core-facet-rear), var(--gh-core-facet-rear-dim))",
    opacity: 0.87,
  },
  {
    id: "bottom",
    clipPath: "polygon(50% 50%, 46% 97%, 12% 76%)",
    translateZ: -25,
    rotateY: 4,
    rotateZ: 5,
    gradient: "linear-gradient(170deg, var(--gh-core-facet-rear), var(--gh-core-facet-rear-dim))",
    opacity: 0.9,
  },
] as const;

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function orbitForStatus(status: string): OrbitLevel | null {
  if (OUTER_STATUSES.has(status)) return "outer";
  if (MIDDLE_STATUSES.has(status)) return "middle";
  if (INNER_STATUSES.has(status)) return "inner";
  return null;
}

function ellipseHalves(rx: number, ry: number) {
  return {
    front: `M ${-rx} 0 A ${rx} ${ry} 0 0 0 ${rx} 0`,
    rear: `M ${-rx} 0 A ${rx} ${ry} 0 0 1 ${rx} 0`,
  };
}

type PositionedNode = {
  id: string;
  orbit: OrbitLevel;
  angleDeg: number;
  x: number;
  y: number;
  z: number;
  front: boolean;
  config: OrbitConfig;
};

function computeNodes(applications: CareerCoreApplication[]): PositionedNode[] {
  const nodes: PositionedNode[] = [];
  for (const application of applications) {
    if (nodes.length >= MAX_NODES) break;
    const orbit = orbitForStatus(application.status);
    if (!orbit) continue;
    const config = ORBITS[orbit];
    const angleDeg = hashId(application.id) % 360;
    const angleRad = (angleDeg * Math.PI) / 180;
    const front = Math.sin(angleRad) >= 0;
    nodes.push({
      id: application.id,
      orbit,
      angleDeg,
      x: Math.cos(angleRad) * config.rx,
      y: Math.sin(angleRad) * config.ry,
      z: config.depth + Math.sin(angleRad) * 14,
      front,
      config,
    });
  }
  return nodes;
}

const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const angle = (index * 63) % 360;
  const rad = (angle * Math.PI) / 180;
  const radius = 62 + ((index * 17) % 46);
  return {
    id: `particle-${index}`,
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius * 0.42,
    z: -30 + ((index * 23) % 60),
    size: 2 + (index % 3),
    duration: 7 + (index % 4) * 1.6,
    delay: index * 0.5,
  };
});

type Reaction = "pulse" | "wave" | "flare" | null;

function reactionForStatus(status: string): Reaction {
  if (status === MILESTONE_STATUS) return "flare";
  if (status === "TECH_INTERVIEW" || status === "TEST_TASK") return "wave";
  if (status === "HR_CALL") return "pulse";
  return null;
}

const REACTION_RANK: Record<Exclude<Reaction, null>, number> = {
  pulse: 1,
  wave: 2,
  flare: 3,
};

export function CareerCore({
  applications,
  isLoading = false,
  onFlare,
}: {
  applications: CareerCoreApplication[];
  isLoading?: boolean;
  onFlare?: () => void;
}) {
  const reduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevStatusRef = useRef<Map<string, string> | null>(null);
  const [reaction, setReaction] = useState<{ kind: Exclude<Reaction, null>; key: number } | null>(
    null,
  );

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 55, damping: 15, mass: 0.6 });
  const springY = useSpring(pointerY, { stiffness: 55, damping: 15, mass: 0.6 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-11, 11]);
  const shiftX = useTransform(springX, [-0.5, 0.5], [-9, 9]);
  const shiftY = useTransform(springY, [-0.5, 0.5], [-6, 6]);

  const hasOffer = useMemo(
    () => applications.some((application) => application.status === MILESTONE_STATUS),
    [applications],
  );

  const nodes = useMemo(() => computeNodes(applications), [applications]);
  const assembling = isLoading && applications.length === 0;

  useEffect(() => {
    const nextStatus = new Map(applications.map((application) => [application.id, application.status]));
    const prevStatus = prevStatusRef.current;

    if (prevStatus) {
      let strongest: Exclude<Reaction, null> | null = null;
      nextStatus.forEach((status, id) => {
        const previous = prevStatus.get(id);
        if (previous === status) return;
        const candidate = reactionForStatus(status);
        if (!candidate) return;
        if (!strongest || REACTION_RANK[candidate] > REACTION_RANK[strongest]) {
          strongest = candidate;
        }
      });
      if (strongest) {
        setReaction({ kind: strongest, key: Date.now() });
        if (strongest === "flare") onFlare?.();
      }
    }

    prevStatusRef.current = nextStatus;
  }, [applications, onFlare]);

  useEffect(() => {
    if (!reaction) return;
    const timeout = window.setTimeout(() => setReaction(null), reduced ? 220 : 950);
    return () => window.clearTimeout(timeout);
  }, [reaction, reduced]);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduced) return;
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const nx = (event.clientX - bounds.left) / bounds.width - 0.5;
    const ny = (event.clientY - bounds.top) / bounds.height - 0.5;
    pointerX.set(nx);
    pointerY.set(ny);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  const coreFlare = reaction?.kind === "flare" || hasOffer;
  const edgeBoost = reaction?.kind === "wave" || reaction?.kind === "flare";

  return (
    <div
      ref={containerRef}
      aria-hidden
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="pointer-events-auto absolute inset-0 m-auto select-none [perspective:1500px]"
      style={{ width: CORE_SIZE, height: CORE_SIZE }}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        style={
          reduced
            ? undefined
            : { rotateX, rotateY, x: shiftX, y: shiftY }
        }
      >
        <div
          className="gh-core-glow absolute inset-[6%] rounded-full"
          style={{
            background: "radial-gradient(circle, var(--gh-core-glow) 0%, transparent 72%)",
            transform: "translate3d(0, 0, -70px) scale(2.1)",
          }}
        />
        <div
          className="absolute inset-[10%] rounded-full"
          style={{
            background: "radial-gradient(circle, var(--gh-core-glow) 0%, transparent 65%)",
            filter: "blur(30px)",
            opacity: 0.55,
            transform: "translate3d(0, 0, -95px) scale(2.7)",
          }}
        />

        <div
          className="absolute inset-x-[18%] bottom-[6%] h-4 rounded-full"
          style={{
            background: "var(--gh-ambient-shadow)",
            filter: "blur(8px)",
            transform: "translate3d(0, 60px, -60px) scale(1.15, 0.55)",
          }}
        />

        {PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `translate3d(${particle.x}px, ${particle.y}px, ${particle.z}px) translate(-50%, -50%)`,
            }}
          >
            <motion.div
              className="rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                background: "var(--gh-particle)",
              }}
              animate={
                reduced
                  ? undefined
                  : { y: [0, -7, 0], opacity: [0.25, 0.7, 0.25] }
              }
              transition={
                reduced
                  ? undefined
                  : {
                      duration: particle.duration,
                      delay: particle.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }
              }
            />
          </div>
        ))}

        {(Object.keys(ORBITS) as OrbitLevel[]).map((level) => {
          const config = ORBITS[level];
          const halves = ellipseHalves(config.rx, config.ry);
          return (
            <motion.svg
              key={`${level}-rear`}
              className="absolute inset-0 m-auto overflow-visible"
              width={config.rx * 2}
              height={config.ry * 2}
              viewBox={`${-config.rx} ${-config.ry} ${config.rx * 2} ${config.ry * 2}`}
              style={{ transform: `translate3d(0, 0, ${config.depth - 4}px)` }}
              animate={
                reduced
                  ? undefined
                  : assembling
                    ? { rotate: [0, 360], opacity: [0.3, 0.7, 0.3] }
                    : { rotate: [0, 360] }
              }
              transition={
                reduced
                  ? undefined
                  : assembling
                    ? { duration: config.spin / 2, repeat: Infinity, ease: "easeInOut" }
                    : { duration: config.spin, repeat: Infinity, ease: "linear" }
              }
            >
              <path
                d={halves.rear}
                fill="none"
                stroke={config.strokeRear}
                strokeWidth={config.widthRear}
                opacity={config.opacityRear}
              />
            </motion.svg>
          );
        })}

        {nodes
          .filter((node) => !node.front)
          .map((node) => (
            <motion.div
              key={node.id}
              className="absolute top-1/2 left-1/2 rounded-full"
              style={{
                width: node.config.nodeSize * 0.8,
                height: node.config.nodeSize * 0.8,
                background: node.config.nodeColor,
                opacity: node.config.nodeOpacity * 0.6,
              }}
              animate={{
                transform: `translate3d(${node.x}px, ${node.y}px, ${node.z}px) translate(-50%, -50%)`,
              }}
              transition={{ duration: reduced ? 0 : 0.7, ease: "easeOut" }}
            />
          ))}

        <motion.div
          className="absolute inset-0 m-auto [transform-style:preserve-3d]"
          style={{ width: "34%", height: "34%" }}
          animate={
            reduced
              ? undefined
              : assembling
                ? { scale: [0.85, 1.04, 0.85], rotateZ: [0, 6, 0] }
                : { scale: [1, 1.018, 1] }
          }
          transition={
            reduced
              ? undefined
              : assembling
                ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
                : { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }
        >
          {FACETS.map((facet) => (
            <div
              key={facet.id}
              className="absolute inset-0"
              style={{
                clipPath: facet.clipPath,
                background: facet.gradient,
                opacity: facet.opacity,
                transform: `translate3d(0, 0, ${facet.translateZ}px) rotateY(${facet.rotateY}deg) rotateZ(${facet.rotateZ}deg)`,
              }}
            />
          ))}

          <div
            className="absolute inset-[30%_30%_50%_8%]"
            style={{
              clipPath: "polygon(0% 40%, 70% 0%, 100% 30%, 40% 70%)",
              background: "var(--gh-core-edge-highlight)",
              opacity: edgeBoost ? 0.95 : 0.65,
              transform: "translate3d(0, 0, 32px)",
              transition: "opacity 0.4s ease-out",
            }}
          />
          <div
            className="absolute inset-[55%_10%_5%_45%]"
            style={{
              clipPath: "polygon(20% 100%, 0% 40%, 60% 20%, 100% 60%)",
              background: "var(--gh-core-rear-glint)",
              opacity: 0.4,
              transform: "translate3d(0, 0, -32px)",
            }}
          />
        </motion.div>

        <motion.div
          className="absolute inset-0 m-auto rounded-full"
          style={{
            width: "13%",
            height: "13%",
            background:
              "radial-gradient(circle at 38% 32%, var(--gh-core-energy-core), var(--gh-accent) 50%, var(--gh-accent-secondary) 100%)",
            boxShadow: coreFlare
              ? "0 0 34px 8px var(--gh-milestone-flare)"
              : "0 0 16px 3px var(--gh-core-glow)",
            transform: "translate3d(0, 0, 40px)",
          }}
          animate={
            reduced
              ? undefined
              : {
                  scale: reaction?.kind === "flare" ? [1, 1.35, 1.08] : [1, 1.06, 1],
                }
          }
          transition={
            reduced
              ? undefined
              : reaction?.kind === "flare"
                ? { duration: 0.9, ease: "easeOut" }
                : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {reaction ? (
          <motion.div
            key={reaction.key}
            className="absolute inset-0 m-auto rounded-full border-2"
            style={{
              width: "34%",
              height: "34%",
              borderColor:
                reaction.kind === "flare"
                  ? "var(--gh-milestone-flare)"
                  : reaction.kind === "wave"
                    ? "var(--gh-orbit-front)"
                    : "var(--gh-ring-mid)",
              transform: "translate3d(0, 0, 40px)",
            }}
            initial={{
              scale: reaction.kind === "wave" ? 1.8 : 1,
              opacity: reaction.kind === "wave" ? 0.55 : 0.85,
            }}
            animate={{
              scale: reaction.kind === "flare" ? 3.6 : reaction.kind === "wave" ? 0.9 : 1.7,
              opacity: 0,
            }}
            transition={{ duration: reduced ? 0.22 : reaction.kind === "flare" ? 0.9 : 0.6 }}
          />
        ) : null}

        {reaction?.kind === "flare" && !reduced
          ? Array.from({ length: FRAGMENT_COUNT }, (_, index) => {
              const angle = (index / FRAGMENT_COUNT) * Math.PI * 2;
              return (
                <motion.div
                  key={`${reaction.key}-fragment-${index}`}
                  className="absolute inset-0 m-auto rounded-full"
                  style={{
                    width: 4,
                    height: 4,
                    background: "var(--gh-milestone-flare)",
                    transform: "translate3d(0, 0, 40px)",
                  }}
                  initial={{ opacity: 1, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    x: Math.cos(angle) * 70,
                    y: Math.sin(angle) * 40,
                  }}
                  transition={{ duration: 0.85, ease: "easeOut" }}
                />
              );
            })
          : null}

        {(Object.keys(ORBITS) as OrbitLevel[]).map((level) => {
          const config = ORBITS[level];
          const halves = ellipseHalves(config.rx, config.ry);
          const pulseThisRing = reaction?.kind === "pulse" && level === "middle";
          return (
            <motion.svg
              key={`${level}-front`}
              className="absolute inset-0 m-auto overflow-visible"
              width={config.rx * 2}
              height={config.ry * 2}
              viewBox={`${-config.rx} ${-config.ry} ${config.rx * 2} ${config.ry * 2}`}
              style={{
                transform: `translate3d(0, 0, ${config.depth + 4}px)`,
                filter: config.glow
                  ? "drop-shadow(0 0 7px var(--gh-ring-front-glow))"
                  : undefined,
              }}
              animate={
                reduced
                  ? undefined
                  : assembling
                    ? { rotate: [0, -360], opacity: [0.35, 0.75, 0.35] }
                    : { rotate: [0, -360] }
              }
              transition={
                reduced
                  ? undefined
                  : assembling
                    ? { duration: config.spin / 2.4, repeat: Infinity, ease: "easeInOut" }
                    : { duration: config.spin + 12, repeat: Infinity, ease: "linear" }
              }
            >
              <path
                d={halves.front}
                fill="none"
                stroke={config.strokeFront}
                strokeWidth={config.widthFront}
                opacity={pulseThisRing ? 1 : config.opacityFront}
              />
            </motion.svg>
          );
        })}

        {nodes
          .filter((node) => node.front)
          .map((node) => {
            const brighten =
              reaction?.kind === "pulse" && node.orbit === "middle";
            return (
              <motion.div
                key={node.id}
                className="absolute top-1/2 left-1/2 rounded-full"
                style={{
                  width: node.config.nodeSize,
                  height: node.config.nodeSize,
                  background: node.config.nodeColor,
                  opacity: node.config.nodeOpacity,
                  boxShadow: brighten
                    ? `0 0 10px 3px ${node.config.nodeColor}`
                    : `0 0 6px 1px ${node.config.nodeColor}`,
                }}
                animate={{
                  transform: `translate3d(${node.x}px, ${node.y}px, ${node.z}px) translate(-50%, -50%) scale(${brighten ? 1.35 : 1})`,
                }}
                transition={{ duration: reduced ? 0 : 0.7, ease: "easeOut" }}
              />
            );
          })}
      </motion.div>
    </div>
  );
}
