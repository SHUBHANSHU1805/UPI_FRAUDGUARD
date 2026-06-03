import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Generate points on a sphere surface using Fibonacci sphere algorithm
function getSpherePoints(count, radius) {
  const points = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);
    
    points.push({
      pos: new THREE.Vector3(x, y, z),
      isFraud: Math.random() < 0.15,
      pulse: Math.random() * Math.PI * 2,
      id: i,
    });
  }
  return points;
}

function GlobeInner() {
  const groupRef = useRef();
  const radius = 2.4;
  const nodeCount = 50;

  // Generate sphere points
  const nodes = useMemo(() => getSpherePoints(nodeCount, radius), []);

  // Compute connections between close points
  const connections = useMemo(() => {
    const lines = [];
    const maxDistance = 1.6;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = nodes[i].pos.distanceTo(nodes[j].pos);
        if (d < maxDistance) {
          lines.push({
            start: nodes[i].pos,
            end: nodes[j].pos,
            isFraud: nodes[i].isFraud && nodes[j].isFraud,
            opacity: 0.1 + (1 - d / maxDistance) * 0.4,
          });
        }
      }
    }
    return lines;
  }, [nodes]);

  // Slow rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.02) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer Wireframe sphere */}
      <mesh>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshBasicMaterial 
          color="#30363d" 
          wireframe 
          transparent 
          opacity={0.12} 
        />
      </mesh>

      {/* Nodes (Points) */}
      {nodes.map((node) => {
        const color = node.isFraud ? "#f85149" : "#58a6ff";
        const scale = node.isFraud ? 0.07 : 0.04;

        return (
          <mesh key={node.id} position={node.pos}>
            <sphereGeometry args={[scale, 8, 8]} />
            <meshBasicMaterial 
              color={color} 
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* Connection Lines */}
      {connections.map((conn, idx) => {
        const points = [conn.start, conn.end];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const color = conn.isFraud ? "#f85149" : "#30363d";
        const opacity = conn.isFraud ? 0.8 : conn.opacity;
        const linewidth = conn.isFraud ? 2 : 1;

        return (
          <line key={idx} geometry={lineGeo}>
            <lineBasicMaterial 
              color={color} 
              transparent 
              opacity={opacity} 
              linewidth={linewidth}
            />
          </line>
        );
      })}
    </group>
  );
}

// Fallback SVG Globe in case Three.js/WebGL is unsupported or still loading
function GlobeFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden select-none pointer-events-none">
      <div className="absolute w-[360px] h-[360px] rounded-full border border-cyber-border-dark/10 animate-[spin_40s_linear_infinite]" />
      <div className="absolute w-[360px] h-[360px] rounded-full border border-cyber-border-dark/20 border-dashed animate-[spin_20s_linear_infinite_reverse]" />
      <svg className="w-80 h-80 opacity-20 text-cyber-blue animate-[spin_60s_linear_infinite]" viewBox="0 0 100 100" fill="none" stroke="currentColor">
        <circle cx="50" cy="50" r="45" strokeWidth="0.5" strokeDasharray="3 3" />
        <ellipse cx="50" cy="50" rx="45" ry="15" strokeWidth="0.5" />
        <ellipse cx="50" cy="50" rx="15" ry="45" strokeWidth="0.5" />
        <line x1="5" y1="50" x2="95" y2="50" strokeWidth="0.5" />
        <line x1="50" y1="5" x2="50" y2="95" strokeWidth="0.5" />
      </svg>
      {/* Glowing nodes in fallback */}
      <div className="absolute w-2 h-2 rounded-full bg-cyber-red animate-ping top-1/4 left-1/3" />
      <div className="absolute w-2 h-2 rounded-full bg-cyber-blue animate-pulse top-2/3 right-1/4" />
      <div className="absolute w-1.5 h-1.5 rounded-full bg-cyber-green top-1/2 right-1/3" />
    </div>
  );
}

export default function NetworkGlobe() {
  const [hasWebGL, setHasWebGL] = useState(true);

  // Check WebGL availability
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
    return <GlobeFallback />;
  }

  return (
    <div className="w-full h-full relative" style={{ minHeight: "350px" }}>
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 65 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.0} />
        <GlobeInner />
      </Canvas>
    </div>
  );
}
