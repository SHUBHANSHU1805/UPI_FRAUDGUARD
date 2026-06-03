import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Colors corresponding to dashboard theme
const RISK_COLORS = {
  LOW: "#3fb950",
  MEDIUM: "#d29922",
  HIGH: "#f85149",
  CRITICAL: "#ff4444",
};

function DonutInner({ data }) {
  const groupRef = useRef();

  // Slow automatic rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.getElapsedTime() * 0.15;
      groupRef.current.rotation.x = -Math.PI / 3.5 + Math.sin(state.clock.getElapsedTime() * 0.25) * 0.05;
      groupRef.current.rotation.y = Math.cos(state.clock.getElapsedTime() * 0.25) * 0.05;
    }
  });

  // Calculate start and arc length for each segment
  const segments = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return [];

    let currentAngle = 0;
    return data.map((item) => {
      const percentage = item.value / total;
      const arc = percentage * Math.PI * 2;
      const segment = {
        name: item.name,
        value: item.value,
        color: RISK_COLORS[item.name] || "#8b949e",
        startAngle: currentAngle,
        arc: arc,
      };
      currentAngle += arc;
      return segment;
    });
  }, [data]);

  if (segments.length === 0) {
    return (
      <mesh>
        <torusGeometry args={[1.0, 0.22, 16, 64, Math.PI * 2]} />
        <meshStandardMaterial color="#21262d" roughness={0.6} />
      </mesh>
    );
  }

  return (
    <group ref={groupRef}>
      {segments.map((seg, idx) => {
        return (
          <group key={seg.name} rotation={[0, 0, seg.startAngle]}>
            <mesh>
              <torusGeometry args={[1.0, 0.22, 16, 64, seg.arc - 0.03]} />
              <meshStandardMaterial 
                color={seg.color} 
                roughness={0.4} 
                metalness={0.4}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function DonutFallback({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return <div className="text-cyber-muted text-xs py-8 text-center">Initializing...</div>;
  }

  let accumulatedPercent = 0;
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none">
      <svg className="w-36 h-36 transform -rotate-90 overflow-visible" viewBox="0 0 32 32">
        {data.map((item) => {
          const percent = item.value / total;
          const strokeDasharray = `${percent * 100} ${100 - percent * 100}`;
          const strokeDashoffset = 100 - accumulatedPercent;
          accumulatedPercent += percent * 100;
          const color = RISK_COLORS[item.name] || "#8b949e";
          
          if (percent === 0) return null;
          
          return (
            <circle
              key={item.name}
              cx="16"
              cy="16"
              r="10"
              fill="transparent"
              stroke={color}
              strokeWidth="4"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
    </div>
  );
}

export default function RiskDonut3D({ data = [] }) {
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

  // Filter out items with value = 0 to prevent geometry bugs
  const filteredData = useMemo(() => {
    return data.filter((item) => item.value > 0);
  }, [data]);

  if (!hasWebGL) {
    return <DonutFallback data={filteredData} />;
  }

  return (
    <div className="w-full h-32 relative select-none">
      <Canvas
        camera={{ position: [0, 0, 2.2], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-5, 5, -2]} intensity={0.4} />
        <DonutInner data={filteredData} />
      </Canvas>
    </div>
  );
}
