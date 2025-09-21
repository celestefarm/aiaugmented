import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

// Global flag to prevent line creation across component re-mounts
let globalLinesCreated = false;

// Reset global flag on page refresh/reload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalLinesCreated = false;
  });
}

// Enhanced design constants to match the target image
const DESIGN_CONFIG = {
  // Luxury and prestige color palette with premium materials
  colors: {
    human: {
      primary: [0xE8B4A0, 0xD4A574, 0xC19A6B, 0xB08D5B, 0x9D7A47, 0x8B6914, 0x785A0F], // Rose gold to deep bronze - ultra-luxury
      secondary: [0xF5C2A7, 0xE1AF94, 0xCD9C81, 0xB9896E, 0xA5765B, 0x916348, 0x7D5035], // Warm champagne to cognac
      glow: 0xD4A574, // Luxurious rose gold glow
      emissive: 0xB08D5B // Rich bronze emissive
    },
    ai: {
      primary: [0x2F4F4F, 0x36454F, 0x3D5A5A, 0x446F6F, 0x4B8484, 0x529999, 0x59AEAE], // Deep teal to platinum - exclusive elegance
      secondary: [0x1C3A3A, 0x234545, 0x2A5050, 0x315B5B, 0x386666, 0x3F7171, 0x467C7C], // Rich emerald depths
      glow: 0x446F6F, // Sophisticated teal glow
      emissive: 0x36454F // Deep slate emissive
    },
    center: 0xF8F8FF, // Pure white with slight warmth
    background: 0x0a0a0a, // Deep luxury black
    stars: 0xFFFFFF // Pristine white stars
  },
  
  // Animation parameters for ultra-dense, complex motion
  animation: {
    orbitSpeed: 0.08, // Restored original speed for elegant movement
    objectCount: 162, // Reduced particle count by 10% (180 * 0.9 = 162)
    cameraDistance: 25,
    breathingAmplitude: 0.4,
    ringCount: 8 // More concentric rings for complexity
  },
  
  // Complex orbital layout - 1 size bigger orbits with proper intersection
  layout: {
    baseRadius: 2.5, // Maintained base radius
    maxRadius: 16.0, // Increased from 15.0 to 16.0 for 1 size bigger orbits
    centerOffset: 0,
    ringSpacing: 1.0 // Maintained spacing between rings
  }
};

interface ThreeJsOrbitAnimationProps {
  className?: string;
}

interface ComplexOrbitSystem {
  objects: THREE.Mesh[];
  trails: THREE.Line[];
  rings: THREE.Line[];
  center: THREE.Vector3;
  type: 'human' | 'ai';
}

interface ElectricStrike {
  line: THREE.Line;
  startTime: number;
  duration: number;
  particle1: THREE.Mesh;
  particle2: THREE.Mesh;
}

const ThreeJsOrbitAnimation: React.FC<ThreeJsOrbitAnimationProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const orbitSystemsRef = useRef<ComplexOrbitSystem[]>([]);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const electricStrikesRef = useRef<ElectricStrike[]>([]);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Mouse tracking for subtle interaction
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!mountRef.current) return;
    
    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }, []);

  // Create simple sphere geometries like network nodes in the attached image
  const createPolyhedralGeometry = useCallback((index: number): THREE.BufferGeometry => {
    // Simple small spheres to match the network node style in the image
    const radius = 0.08 + Math.random() * 0.04; // Small, consistent sphere sizes
    return new THREE.SphereGeometry(radius, 16, 12); // Smooth spheres with good detail
  }, []);

  // Create electric strike effect between two particles
  const createElectricStrike = useCallback((particle1: THREE.Mesh, particle2: THREE.Mesh): ElectricStrike => {
    // Get world positions of both particles
    const pos1 = new THREE.Vector3();
    const pos2 = new THREE.Vector3();
    particle1.getWorldPosition(pos1);
    particle2.getWorldPosition(pos2);

    // Create lightning-like path with multiple segments
    const segments = 12;
    const points: THREE.Vector3[] = [];
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const basePoint = new THREE.Vector3().lerpVectors(pos1, pos2, t);
      
      // Add random displacement for lightning effect (less at endpoints)
      const displacement = Math.sin(t * Math.PI) * 0.5; // Increased displacement for more dramatic effect
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * displacement,
        (Math.random() - 0.5) * displacement,
        (Math.random() - 0.5) * displacement
      );
      
      points.push(basePoint.add(randomOffset));
    }

    // Create geometry from points
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Create electric material with slightly stronger intensity
    const material = new THREE.LineBasicMaterial({
      color: 0x00FFFF, // Bright cyan for better visibility
      transparent: true,
      opacity: 0.6, // Increased opacity for stronger effect
      linewidth: 3, // Slightly thicker line for more visibility
      blending: THREE.AdditiveBlending
    });

    const line = new THREE.Line(geometry, material);
    
    return {
      line,
      startTime: Date.now(),
      duration: 500 + Math.random() * 500, // Longer duration: 500-1000ms
      particle1,
      particle2
    };
  }, []);

  // Check for collisions between particles from different systems
  const checkParticleCollisions = useCallback(() => {
    if (!sceneRef.current || orbitSystemsRef.current.length < 2) return;

    const humanSystem = orbitSystemsRef.current.find(s => s.type === 'human');
    const aiSystem = orbitSystemsRef.current.find(s => s.type === 'ai');
    
    if (!humanSystem || !aiSystem) return;

    const collisionDistance = 1.5; // Increased distance threshold for easier collision detection
    const humanGroup = sceneRef.current.userData.humanGroup;
    const aiGroup = sceneRef.current.userData.aiGroup;

    if (!humanGroup || !aiGroup) return;

    // Check each human particle against each AI particle
    humanSystem.objects.forEach(humanParticle => {
      aiSystem.objects.forEach(aiParticle => {
        // Get world positions
        const humanPos = new THREE.Vector3();
        const aiPos = new THREE.Vector3();
        humanParticle.getWorldPosition(humanPos);
        aiParticle.getWorldPosition(aiPos);

        const distance = humanPos.distanceTo(aiPos);
        
        if (distance < collisionDistance) {
          // Check if we already have a strike between these particles
          const existingStrike = electricStrikesRef.current.find(strike =>
            (strike.particle1 === humanParticle && strike.particle2 === aiParticle) ||
            (strike.particle1 === aiParticle && strike.particle2 === humanParticle)
          );

          if (!existingStrike) {
            // Create new electric strike
            const strike = createElectricStrike(humanParticle, aiParticle);
            electricStrikesRef.current.push(strike);
            sceneRef.current.add(strike.line);
            
            // Debug log
            console.log('Electric strike created between particles at distance:', distance);
          }
        }
      });
    });
  }, [createElectricStrike]);

  // Update electric strikes
  const updateElectricStrikes = useCallback(() => {
    if (!sceneRef.current) return;

    const currentTime = Date.now();
    
    // Update existing strikes and remove expired ones
    electricStrikesRef.current = electricStrikesRef.current.filter(strike => {
      const age = currentTime - strike.startTime;
      
      if (age > strike.duration) {
        // Remove expired strike
        sceneRef.current!.remove(strike.line);
        strike.line.geometry.dispose();
        if (Array.isArray(strike.line.material)) {
          strike.line.material.forEach(mat => mat.dispose());
        } else {
          strike.line.material.dispose();
        }
        return false;
      }

      // Update strike appearance (fade out over time)
      const fadeProgress = age / strike.duration;
      const opacity = 1 - fadeProgress;
      
      if (strike.line.material instanceof THREE.LineBasicMaterial) {
        strike.line.material.opacity = opacity * 0.9;
        
        // Add flickering effect
        const flicker = Math.sin(age * 0.05) * 0.3 + 0.7;
        strike.line.material.opacity *= flicker;
      }

      return true;
    });
  }, []);


  // Create dynamic network lines between particles of the same type
  const createStaticNetworkLines = useCallback((
    particles: THREE.Mesh[],
    type: 'human' | 'ai',
    scene: THREE.Scene
  ) => {
    const maxDistance = 5.0; // Increased from 4.0 to 5.0 to allow longer connections
    const longLineThreshold = 3.5; // Define what constitutes a "long line"
    const lineColor = type === 'human' ? 0xD4A574 : 0x5A9999;
    
    // ALWAYS clear existing connections first to prevent accumulation
    const existingConnectionsKey = type === 'human' ? 'humanConnections' : 'aiConnections';
    if (scene.userData[existingConnectionsKey]) {
      console.log(`Clearing existing ${type} connections:`, scene.userData[existingConnectionsKey].length);
      scene.userData[existingConnectionsKey].forEach(({ line }) => {
        scene.remove(line);
        line.geometry.dispose();
        if (Array.isArray(line.material)) {
          line.material.forEach(mat => mat.dispose());
        } else {
          line.material.dispose();
        }
      });
      scene.userData[existingConnectionsKey] = [];
    }
    
    console.log(`Creating ${type} dynamic network lines:`, {
      particleCount: particles.length,
      maxDistance,
      longLineThreshold,
      lineColor: lineColor.toString(16)
    });
    
    const connections: Array<{
      line: THREE.Line;
      particle1: THREE.Mesh;
      particle2: THREE.Mesh;
    }> = [];
    
    let linesCreated = 0;
    let longLinesCreated = 0;
    
    // Use deterministic approach with preference for longer lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const particle1 = particles[i];
        const particle2 = particles[j];
        
        // Create line with initial positions
        const worldPos1 = new THREE.Vector3();
        const worldPos2 = new THREE.Vector3();
        particle1.getWorldPosition(worldPos1);
        particle2.getWorldPosition(worldPos2);
        
        const distance = worldPos1.distanceTo(worldPos2);
        
        if (distance <= maxDistance) {
          // Enhanced connection logic with reduced overall line density (10% fewer total lines)
          const isLongLine = distance >= longLineThreshold;
          const baseConnection = ((i + j) % 3 === 0) && ((i * j) % 11 === 0); // Reduced base connection density (10% fewer lines)
          const longLineBonus = isLongLine && ((i + j) % 3 === 0); // Maintained maximum long line connections
          
          const shouldConnect = baseConnection || longLineBonus;
          if (!shouldConnect) continue;
          
          const points = [worldPos1.clone(), worldPos2.clone()];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const material = new THREE.LineBasicMaterial({
            color: lineColor,
            transparent: true,
            opacity: 0.2, // Made thinner/finer by reducing opacity
            linewidth: 1
          });
          
          const line = new THREE.Line(geometry, material);
          scene.add(line);
          
          connections.push({
            line,
            particle1,
            particle2
          });
          
          linesCreated++;
          if (isLongLine) longLinesCreated++;
        }
      }
    }
    
    console.log(`${type} long lines created:`, longLinesCreated, 'out of', linesCreated, 'total lines');
    
    // Store connections for animation updates
    scene.userData[existingConnectionsKey] = connections;
    
    console.log(`${type} dynamic lines created:`, linesCreated);
    return connections;
  }, []);

  // Create complex orbital system with multiple rings
  const createComplexOrbitSystem = useCallback((
    type: 'human' | 'ai',
    centerPosition: THREE.Vector3
  ): ComplexOrbitSystem => {
    const objects: THREE.Mesh[] = [];
    const trails: THREE.Line[] = [];
    const rings: THREE.Line[] = [];
    
    const colorConfig = type === 'human' ? DESIGN_CONFIG.colors.human : DESIGN_CONFIG.colors.ai;

    // Create multiple concentric orbital rings
    for (let ring = 0; ring < DESIGN_CONFIG.animation.ringCount; ring++) {
      const ringRadius = DESIGN_CONFIG.layout.baseRadius + (ring * DESIGN_CONFIG.layout.ringSpacing);
      const objectsInRing = Math.floor(DESIGN_CONFIG.animation.objectCount / DESIGN_CONFIG.animation.ringCount) + Math.floor(Math.random() * 5);

      // Ring visualization removed for cleaner look

      // Create objects in this ring
      for (let i = 0; i < objectsInRing; i++) {
        const geometry = createPolyhedralGeometry(i);
        
        // Create elegant gold gradient texture like the attached example
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d')!;
        
        // Create sophisticated gold gradient inspired by the luxury design example
        const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
        
        if (type === 'human') {
          // Elegant gold gradient for human particles - matching the luxury invitation style
          gradient.addColorStop(0, '#FFD700');    // Bright gold center
          gradient.addColorStop(0.3, '#DAA520');  // Rich gold
          gradient.addColorStop(0.6, '#B8860B');  // Darker gold
          gradient.addColorStop(0.8, '#8B6914');  // Deep gold
          gradient.addColorStop(1, '#2C1810');    // Dark bronze edge
        } else {
          // Ultra-bright sophisticated teal-platinum gradient for AI particles
          gradient.addColorStop(0, '#D0F0FF');    // Ultra-bright light platinum center
          gradient.addColorStop(0.3, '#9AD5E0');  // Ultra-bright cadet blue
          gradient.addColorStop(0.6, '#85C5E8');  // Ultra-bright steel blue
          gradient.addColorStop(0.8, '#5A8080');  // Much brighter dark slate
          gradient.addColorStop(1, '#464646');    // Much brighter charcoal edge
        }
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 256, 256);
        
        // Add subtle texture overlay for premium finish
        context.globalCompositeOperation = 'overlay';
        context.fillStyle = 'rgba(255, 255, 255, 0.1)';
        context.fillRect(0, 0, 256, 256);
        
        // Create texture from gradient canvas
        const gradientTexture = new THREE.CanvasTexture(canvas);
        gradientTexture.wrapS = THREE.RepeatWrapping;
        gradientTexture.wrapT = THREE.RepeatWrapping;
        
        const material = new THREE.MeshPhysicalMaterial({
          map: gradientTexture, // Apply elegant gradient texture
          color: new THREE.Color(0xffffff), // White base to show texture colors
          metalness: 0.95, // Ultra-high metalness for premium gold/platinum effect
          roughness: 0.02, // Ultra-smooth for mirror-like finish
          clearcoat: 1.0,
          clearcoatRoughness: 0.01, // Perfect clearcoat for luxury
          transmission: 0.05, // Minimal transparency for solid luxury feel
          thickness: 1.0, // Maximum thickness for premium weight
          ior: 2.8, // Higher IOR for premium refraction
          emissive: new THREE.Color(type === 'human' ? 0x332211 : 0x112233),
          emissiveIntensity: 0.15, // Subtle glow to enhance gradient
          transparent: true,
          opacity: 0.95, // High opacity for solid premium feel
          side: THREE.DoubleSide,
          envMapIntensity: 3.0, // Maximum reflections for luxury
          reflectivity: 0.95, // Ultra-high reflectivity
          sheen: 1.0, // Maximum luxury sheen
          sheenColor: new THREE.Color(type === 'human' ? 0xFFD700 : 0x87CEEB)
        });

        const object = new THREE.Mesh(geometry, material);
        
        // Position objects along ring with slightly wider spread
        const angle = (i / objectsInRing) * Math.PI * 2;
        const radiusVariation = ringRadius + (Math.random() - 0.5) * 0.75; // Increased from 0.55 to 0.75 for wider spread
        const heightVariation = (Math.random() - 0.5) * 1.8; // Increased from 1.5 to 1.8 for more vertical spread
        
        object.position.set(
          centerPosition.x + Math.cos(angle) * radiusVariation,
          centerPosition.y + heightVariation,
          centerPosition.z + Math.sin(angle) * radiusVariation
        );

        // Store orbital properties
        object.userData = {
          originalRadius: radiusVariation,
          angle: angle,
          speed: 0.5 + Math.random() * 1.0,
          ring: ring,
          pulsePhase: Math.random() * Math.PI * 2,
          type: type,
          rotationSpeed: {
            x: (Math.random() - 0.5) * 0.02,
            y: (Math.random() - 0.5) * 0.02,
            z: (Math.random() - 0.5) * 0.02
          }
        };

        objects.push(object);

        // Particle trails removed for cleaner look
      }
    }

    return {
      objects,
      trails,
      rings,
      center: centerPosition,
      type
    };
  }, [createPolyhedralGeometry]);

  // Create central lens flare effect
  const createCentralFlare = useCallback((position: THREE.Vector3): THREE.Group => {
    const flareGroup = new THREE.Group();
    
    // Ultra-bright central core
    const coreGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(DESIGN_CONFIG.colors.center),
      transparent: true,
      opacity: 1.0
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    flareGroup.add(core);

    // Multiple bright glow rings
    for (let i = 0; i < 5; i++) {
      const glowGeometry = new THREE.RingGeometry(0.6 + i * 0.4, 0.9 + i * 0.4, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(DESIGN_CONFIG.colors.center),
        transparent: true,
        opacity: 0.6 - i * 0.1, // Brighter initial opacity
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.rotation.x = Math.random() * Math.PI;
      glow.rotation.y = Math.random() * Math.PI;
      flareGroup.add(glow);
    }

    // More prominent lens flare spikes
    for (let i = 0; i < 12; i++) {
      const spikeGeometry = new THREE.PlaneGeometry(0.15, 6);
      const spikeMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(DESIGN_CONFIG.colors.center),
        transparent: true,
        opacity: 0.7, // Much brighter spikes
        blending: THREE.AdditiveBlending
      });
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
      spike.rotation.z = (i / 12) * Math.PI * 2;
      flareGroup.add(spike);
    }

    flareGroup.position.copy(position);
    return flareGroup;
  }, []);


  // Initialize scene without font loading
  const initComplexThreeJS = useCallback(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Pure black background
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, DESIGN_CONFIG.animation.cameraDistance);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Premium renderer setup for luxury visual quality
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp',
      logarithmicDepthBuffer: true
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4; // Increased for luxury brightness
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);


    // Luxury lighting setup for premium material showcase
    const ambientLight = new THREE.AmbientLight(0x2a2a2a, 0.3); // Subtle ambient for luxury depth
    scene.add(ambientLight);

    // Primary key light for dramatic luxury illumination
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(15, 15, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    scene.add(keyLight);

    // Rim lighting for luxury edge definition
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
    rimLight.position.set(-10, 5, -10);
    scene.add(rimLight);

    // Premium colored accent lights - will be positioned after center calculations
    const humanLight = new THREE.PointLight(DESIGN_CONFIG.colors.human.glow, 3.5, 25);
    humanLight.castShadow = true;
    scene.add(humanLight);

    const aiLight = new THREE.PointLight(DESIGN_CONFIG.colors.ai.glow, 3.5, 25);
    aiLight.castShadow = true;
    scene.add(aiLight);

    // Additional luxury spot lights for premium highlights
    const spotLight1 = new THREE.SpotLight(0xffffff, 2.0, 30, Math.PI / 6, 0.3);
    spotLight1.position.set(0, 10, 8);
    spotLight1.target.position.set(0, 0, 0);
    scene.add(spotLight1);
    scene.add(spotLight1.target);

    const spotLight2 = new THREE.SpotLight(0xf0f0f0, 1.5, 25, Math.PI / 8, 0.4);
    spotLight2.position.set(-8, 6, 5);
    spotLight2.target.position.set(-3, 0, 0);
    scene.add(spotLight2);
    scene.add(spotLight2.target);

    // Create separate orbital systems with slightly bigger orbits and proper intersection
    // Calculated to maintain good intersection while making orbits slightly bigger
    const maxRadius = DESIGN_CONFIG.layout.baseRadius + ((DESIGN_CONFIG.animation.ringCount - 1) * DESIGN_CONFIG.layout.ringSpacing);
    const optimalCenterDistance = maxRadius * 1.2; // Reduced from 1.35 to 1.2 for more intersection with bigger orbits
    const halfDistance = optimalCenterDistance / 2;
    
    const humanCenter = new THREE.Vector3(-halfDistance, 1, 0);  // Left orbit center - slightly lower
    const aiCenter = new THREE.Vector3(halfDistance, 1, 0);      // Right orbit center - slightly lower
    
    // DEBUG: Log updated orbit configuration
    const centerDistance = humanCenter.distanceTo(aiCenter);
    const totalOrbitSpan = maxRadius * 2;
    const overlapAmount = totalOrbitSpan - centerDistance;
    const intersectionZone = overlapAmount > 0 ? overlapAmount : 0;
    
    console.log('=== UPDATED ORBIT CONFIGURATION ===');
    console.log('Base radius:', DESIGN_CONFIG.layout.baseRadius);
    console.log('Max radius:', maxRadius);
    console.log('Optimal center distance:', optimalCenterDistance.toFixed(2));
    console.log('Actual center distance:', centerDistance.toFixed(2));
    console.log('Human center:', humanCenter.x.toFixed(2), humanCenter.y, humanCenter.z);
    console.log('AI center:', aiCenter.x.toFixed(2), aiCenter.y, aiCenter.z);
    console.log('Total orbit span:', totalOrbitSpan.toFixed(2));
    console.log('Intersection zone width:', intersectionZone.toFixed(2));
    console.log('Overlap percentage:', intersectionZone > 0 ? ((intersectionZone / centerDistance) * 100).toFixed(1) + '%' : '0% (separated)');
    console.log('===================================');
    
    // Position the accent lights at the calculated centers
    humanLight.position.set(humanCenter.x, 2, 3);
    aiLight.position.set(aiCenter.x, 2, 3);
    
    // Create separate systems that will overlap in the middle
    const humanSystem = createComplexOrbitSystem('human', humanCenter);
    const aiSystem = createComplexOrbitSystem('ai', aiCenter);
    
    orbitSystemsRef.current = [humanSystem, aiSystem];

    // Create groups for each orbital system to apply vertical rotation
    const humanGroup = new THREE.Group();
    const aiGroup = new THREE.Group();
    
    // Apply 90-degree rotation on X-axis to make orbits vertical
    humanGroup.rotation.x = Math.PI / 2;
    aiGroup.rotation.x = Math.PI / 2;
    
    // Position the groups at their respective centers
    humanGroup.position.copy(humanCenter);
    aiGroup.position.copy(aiCenter);

    // Add all human system objects to human group
    humanSystem.objects.forEach(obj => {
      // Adjust object position relative to group center
      obj.position.sub(humanCenter);
      humanGroup.add(obj);
      obj.castShadow = true;
      obj.receiveShadow = true;
    });

    // Add all AI system objects to AI group
    aiSystem.objects.forEach(obj => {
      // Adjust object position relative to group center
      obj.position.sub(aiCenter);
      aiGroup.add(obj);
      obj.castShadow = true;
      obj.receiveShadow = true;
    });

    // Trails removed for cleaner look

    // Rings removed for cleaner look
    
    // Add groups to scene
    scene.add(humanGroup);
    scene.add(aiGroup);
    
    // Store groups for animation updates
    scene.userData.humanGroup = humanGroup;
    scene.userData.aiGroup = aiGroup;

    // Central flare removed - replaced with simple "x" in HTML overlay
    // const centralFlare = createCentralFlare(new THREE.Vector3(0, 0, 0));
    // scene.add(centralFlare);
    // scene.userData.centralFlare = centralFlare;

    // Create static network lines immediately during initialization
    // Always create lines on fresh component mount (page refresh)
    if (!scene.userData.linesCreated) {
      console.log('=== CREATING STATIC NETWORK LINES ===');
      console.log('Human system objects:', humanSystem.objects.length);
      console.log('AI system objects:', aiSystem.objects.length);
      
      // Create static lines for human particles
      createStaticNetworkLines(humanSystem.objects, 'human', scene);
      console.log('Human static lines created');
      
      // Create static lines for AI particles
      createStaticNetworkLines(aiSystem.objects, 'ai', scene);
      console.log('AI static lines created');
      console.log('=====================================');
      
      // Mark lines as created to prevent duplicates within this component instance
      scene.userData.linesCreated = true;
    }

    setIsLoaded(true);
  }, [createComplexOrbitSystem, createCentralFlare, createStaticNetworkLines]);

  // Complex animation loop
  const animate = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    const deltaTime = clockRef.current.getDelta();
    const elapsedTime = clockRef.current.getElapsedTime();

    // Animate orbital systems
    orbitSystemsRef.current.forEach((system) => {
      // Animate objects
      system.objects.forEach((object, objectIndex) => {
        const userData = object.userData;
        
        if (!reducedMotion) {
          // Complex orbital motion - human orbits move anti-clockwise, AI orbits move clockwise
          const rotationDirection = userData.type === 'human' ? -1 : 1;
          userData.angle += deltaTime * userData.speed * DESIGN_CONFIG.animation.orbitSpeed * rotationDirection;
          
          const radius = userData.originalRadius + Math.sin(elapsedTime * 0.5 + userData.pulsePhase) * 0.2;
          const height = Math.sin(elapsedTime * 0.3 + userData.pulsePhase) * 1.0;
          
          // Position objects relative to group center (0,0,0) since they're now in groups
          object.position.set(
            Math.cos(userData.angle) * radius,
            height,
            Math.sin(userData.angle) * radius
          );
          
          // Complex rotation
          object.rotation.x += userData.rotationSpeed.x;
          object.rotation.y += userData.rotationSpeed.y;
          object.rotation.z += userData.rotationSpeed.z;
          
          // Pulsing emissive intensity
          if (object.material instanceof THREE.MeshPhysicalMaterial) {
            const pulse = Math.sin(elapsedTime * 2 + userData.pulsePhase) * 0.1 + 0.25;
            object.material.emissiveIntensity = pulse;
          }
        }
        
        // Trail updates removed for cleaner look
      });


      // Ring animations removed for cleaner look
    });

    // Check for particle collisions and update electric strikes
    if (!reducedMotion) {
      checkParticleCollisions();
    }
    updateElectricStrikes();

    // Update dynamic network lines to follow particles
    if (sceneRef.current.userData.humanConnections) {
      sceneRef.current.userData.humanConnections.forEach(({ line, particle1, particle2 }) => {
        const worldPos1 = new THREE.Vector3();
        const worldPos2 = new THREE.Vector3();
        particle1.getWorldPosition(worldPos1);
        particle2.getWorldPosition(worldPos2);
        
        const positions = line.geometry.attributes.position;
        positions.setXYZ(0, worldPos1.x, worldPos1.y, worldPos1.z);
        positions.setXYZ(1, worldPos2.x, worldPos2.y, worldPos2.z);
        positions.needsUpdate = true;
      });
    }
    
    if (sceneRef.current.userData.aiConnections) {
      sceneRef.current.userData.aiConnections.forEach(({ line, particle1, particle2 }) => {
        const worldPos1 = new THREE.Vector3();
        const worldPos2 = new THREE.Vector3();
        particle1.getWorldPosition(worldPos1);
        particle2.getWorldPosition(worldPos2);
        
        const positions = line.geometry.attributes.position;
        positions.setXYZ(0, worldPos1.x, worldPos1.y, worldPos1.z);
        positions.setXYZ(1, worldPos2.x, worldPos2.y, worldPos2.z);
        positions.needsUpdate = true;
      });
    }

    // Central flare animation removed
    // if (sceneRef.current.userData.centralFlare) {
    //   const flare = sceneRef.current.userData.centralFlare;
    //   flare.rotation.z += deltaTime * 0.5;
    //
    //   // Pulsing intensity for flare children
    //   flare.children.forEach((child, index) => {
    //     if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
    //       const pulse = Math.sin(elapsedTime * 3 + index * 0.3) * 0.2 + 1.0;
    //       child.material.opacity = Math.min(pulse, 1.0);
    //     }
    //   });
    // }

    // Subtle camera movement
    if (!reducedMotion) {
      const cameraRadius = 2;
      cameraRef.current.position.x = Math.sin(elapsedTime * 0.05) * cameraRadius;
      cameraRef.current.position.y = Math.cos(elapsedTime * 0.03) * cameraRadius;
      cameraRef.current.lookAt(0, 0, 0);
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationIdRef.current = requestAnimationFrame(animate);
  }, [reducedMotion]);

  // Handle window resize
  const handleResize = useCallback(() => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, []);

  // Initialize and cleanup
  useEffect(() => {
    initComplexThreeJS();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      // Cleanup electric strikes
      electricStrikesRef.current.forEach(strike => {
        if (sceneRef.current) {
          sceneRef.current.remove(strike.line);
        }
        strike.line.geometry.dispose();
        if (Array.isArray(strike.line.material)) {
          strike.line.material.forEach(mat => mat.dispose());
        } else {
          strike.line.material.dispose();
        }
      });
      electricStrikesRef.current = [];

      // Cleanup network connections
      if (sceneRef.current) {
        if (sceneRef.current.userData.humanConnections) {
          sceneRef.current.userData.humanConnections.forEach(({ line }) => {
            sceneRef.current!.remove(line);
            line.geometry.dispose();
            if (Array.isArray(line.material)) {
              line.material.forEach(mat => mat.dispose());
            } else {
              line.material.dispose();
            }
          });
        }
        if (sceneRef.current.userData.aiConnections) {
          sceneRef.current.userData.aiConnections.forEach(({ line }) => {
            sceneRef.current!.remove(line);
            line.geometry.dispose();
            if (Array.isArray(line.material)) {
              line.material.forEach(mat => mat.dispose());
            } else {
              line.material.dispose();
            }
          });
        }
      }

      // Cleanup geometries and materials
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, [initComplexThreeJS, handleResize, handleMouseMove, checkParticleCollisions, updateElectricStrikes]);

  // Start animation when loaded
  useEffect(() => {
    if (isLoaded) {
      animate();
    }
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isLoaded, animate]);

  return (
    <div
      ref={mountRef}
      className={`threejs-orbit-animation ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none'
      }}
    />
  );
};

export default ThreeJsOrbitAnimation;