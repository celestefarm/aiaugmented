import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

// Enhanced design constants to match the target image
const DESIGN_CONFIG = {
  // Ultra-vibrant color palette matching the target image exactly
  colors: {
    human: {
      primary: [0xFFFF00, 0xFFD700, 0xFF8C00, 0xFF6347, 0xFF4500, 0xDC143C, 0xB22222], // Bright yellows, golds, oranges, reds
      secondary: [0xFFA500, 0xFF7F00, 0xFF4500, 0xDC143C, 0xB22222, 0x8B0000, 0x800000], // Darker warm variants
      glow: 0xFFFF00, // Bright yellow glow
      emissive: 0xFF8C00 // Bright orange emissive
    },
    ai: {
      primary: [0x00FFFF, 0x00BFFF, 0x1E90FF, 0x4169E1, 0x6A5ACD, 0x8A2BE2, 0x9932CC], // Bright cyans, blues, purples
      secondary: [0x0080FF, 0x0066CC, 0x4B0082, 0x6A0DAD, 0x8B008B, 0x9400D3, 0x4B0082], // Darker cool variants
      glow: 0x00FFFF, // Bright cyan glow
      emissive: 0x00BFFF // Bright blue emissive
    },
    center: 0xFFFFFF, // Bright white for central flare
    background: 0x0a0a0a, // Dark space
    stars: 0xFFFFFF // White stars
  },
  
  // Animation parameters for ultra-dense, complex motion
  animation: {
    orbitSpeed: 0.08, // Reduced speed for more elegant, slower movement
    objectCount: 249, // Increased particle count by another 50% for ultra-maximum visual density
    cameraDistance: 25,
    breathingAmplitude: 0.4,
    ringCount: 8 // More concentric rings for complexity
  },
  
  // Complex orbital layout - wider orbits with increased radii
  layout: {
    baseRadius: 4.0,
    maxRadius: 8.0,
    centerOffset: 0,
    ringSpacing: 0.7
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

const ThreeJsOrbitAnimation: React.FC<ThreeJsOrbitAnimationProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const orbitSystemsRef = useRef<ComplexOrbitSystem[]>([]);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  
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

  // Create varied polyhedral geometries - smaller sizes for more delicate appearance
  const createPolyhedralGeometry = useCallback((index: number): THREE.BufferGeometry => {
    const geometries = [
      () => new THREE.IcosahedronGeometry(0.15 + Math.random() * 0.2, 0),
      () => new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.2, 0),
      () => new THREE.OctahedronGeometry(0.15 + Math.random() * 0.2, 0),
      () => new THREE.TetrahedronGeometry(0.2 + Math.random() * 0.25, 0),
      () => new THREE.BoxGeometry(0.2 + Math.random() * 0.15, 0.2 + Math.random() * 0.15, 0.2 + Math.random() * 0.15),
      () => new THREE.ConeGeometry(0.15 + Math.random() * 0.1, 0.3 + Math.random() * 0.2, 6),
      () => new THREE.CylinderGeometry(0.1 + Math.random() * 0.1, 0.1 + Math.random() * 0.1, 0.2 + Math.random() * 0.15, 8)
    ];
    
    const geometryIndex = Math.floor(Math.random() * geometries.length);
    return geometries[geometryIndex]();
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
        
        // Select random color from palette
        const colorIndex = Math.floor(Math.random() * colorConfig.primary.length);
        const primaryColor = colorConfig.primary[colorIndex];
        const secondaryColor = colorConfig.secondary[colorIndex];
        
        const material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(primaryColor),
          metalness: 0.1,
          roughness: 0.02,
          clearcoat: 1.0,
          clearcoatRoughness: 0.01,
          transmission: 0.8, // Glass transmission
          thickness: 0.3, // Glass thickness
          ior: 1.5, // Index of refraction for glass
          emissive: new THREE.Color(colorConfig.emissive),
          emissiveIntensity: 0.1 + Math.random() * 0.2, // Reduced for glass effect
          transparent: true,
          opacity: 0.2 + Math.random() * 0.3, // Much more transparent for glass effect
          side: THREE.DoubleSide,
          envMapIntensity: 1.5
        });

        const object = new THREE.Mesh(geometry, material);
        
        // Position objects along ring
        const angle = (i / objectsInRing) * Math.PI * 2;
        const radiusVariation = ringRadius + (Math.random() - 0.5) * 0.5;
        const heightVariation = (Math.random() - 0.5) * 2;
        
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
    scene.background = new THREE.Color(DESIGN_CONFIG.colors.background);
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

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);


    // Enhanced lighting setup for more vibrant colors
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(10, 10, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Additional colored lights for vibrancy - positioned at text areas
    const humanLight = new THREE.PointLight(DESIGN_CONFIG.colors.human.glow, 2.0, 20);
    humanLight.position.set(-5, 0, 2);
    scene.add(humanLight);

    const aiLight = new THREE.PointLight(DESIGN_CONFIG.colors.ai.glow, 2.0, 20);
    aiLight.position.set(5, 0, 2);
    scene.add(aiLight);

    // Create separate orbital systems centered on each text area with overlapping radii
    // Move centers further apart and positioned at center level
    const humanCenter = new THREE.Vector3(-5, 0, 0);  // Left text area - further left at center level
    const aiCenter = new THREE.Vector3(5, 0, 0);      // Right text area - further right at center level
    
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

    setIsLoaded(true);
  }, [createComplexOrbitSystem, createCentralFlare]);

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
          
          const radius = userData.originalRadius + Math.sin(elapsedTime * 0.5 + userData.pulsePhase) * 0.3;
          const height = Math.sin(elapsedTime * 0.3 + userData.pulsePhase) * 1.5;
          
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
  }, [initComplexThreeJS, handleResize, handleMouseMove]);

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