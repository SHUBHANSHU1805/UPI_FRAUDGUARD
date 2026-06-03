import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

function GaugeInner({ value }) {
  const activeRingRef = useRef();
  const [currentVal, setCurrentVal] = useState(0);

  // Smoothly animate the value towards target value in React space
  useEffect(() => {
    let animationFrameId;
    let start = currentVal;
    const end = value;
    const duration = 800; // ms
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuad = progress * (2 - progress);
      const val = easeOutQuad * (end - start) + start;
      setCurrentVal(val);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  // Calculate color based on value
  const color = useMemo(() => {
    if (currentVal < 0.3) return "#3fb950"; // Green
    if (currentVal < 0.7) return "#d29922"; // Amber
    return "#f85149"; // Red
  }, [currentVal]);

  return (
    <group rotation={[0, 0, Math.PI]} position={[0, -0.2, 0]}>
      {/* Background Track Ring (Semicircle) */}
      <mesh>
        <torusGeometry args={[1.2, 0.16, 16, 64, Math.PI]} />
        <meshStandardMaterial 
          color="#21262d" 
          roughness={0.5} 
          metalness={0.2}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Active Fill Ring */}
      {currentVal > 0 && (
        <mesh ref={activeRingRef}>
          <torusGeometry args={[1.2, 0.17, 16, 64, currentVal * Math.PI]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.3} 
            metalness={0.5}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Central Value Label */}
      <Html position={[0, 0.3, 0]} center transform={false}>
        <div className="flex flex-col items-center justify-center font-mono text-center select-none" style={{ transform: "rotate(180deg)" }}>
          <span 
            className="text-2xl font-bold font-syne tracking-tight"
            style={{ color: color }}
          >
            {(value * 100).toFixed(1)}%
          </span>
          <span className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-semibold mt-0.5">
            Fraud Prob
          </span>
        </div>
      </Html>
    </group>
  );
}

function GaugeFallback({ value }) {
  const percentage = value * 100;
  const color = value < 0.3 ? "#3fb950" : value < 0.7 ? "#d29922" : "#f85149";
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none">
      <svg className="w-48 h-28 overflow-visible" viewBox="0 0 100 50">
        {/* Track */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#21262d"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="10.5"
          strokeLinecap="round"
          strokeDasharray={`${Math.PI * 40}`}
          strokeDashoffset={`${Math.PI * 40 * (1 - value)}`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute bottom-4 flex flex-col items-center justify-center font-mono">
        <span className="text-2xl font-bold font-syne" style={{ color }}>
          {percentage.toFixed(1)}%
        </span>
        <span className="text-[9px] uppercase tracking-wider text-cyber-muted-dark font-semibold">
          Fraud Prob
        </span>
      </div>
    </div>
  );
}

export default function Gauge3D({ value = 0.0 }) {
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const support = !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
      setHasWebGL(support);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) {
    return <GaugeFallback value={value} />;
  }

  // Bound check
  const clampedValue = Math.min(1.0, Math.max(0.0, value));

  return (
    <div className="w-full h-40 relative select-none">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-5, 5, -2]} intensity={0.4} />
        <GaugeInner value={clampedValue} />
      </Canvas>
    </div>
  );
}
