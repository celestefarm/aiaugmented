import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

interface ThreeJsOrbitAnimationProps {
  className?: string;
}

// Error boundary for Three.js failures
const withErrorBoundary = (Component: React.ComponentType<any>) => {
  return (props: any) => {
    const [hasError, setHasError] = useState(false);
    
    useEffect(() => {
      const handleError = (error: ErrorEvent) => {
        if (error.message.includes('WebGL') || error.message.includes('three')) {
          console.warn('Three.js error detected, falling back to CSS animation:', error);
          setHasError(true);
        }
      };
      
      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, []);
    
    if (hasError) {
      return (
        <div className="threejs-fallback orbit-animation-container">
          {/* Fallback CSS animation would go here */}
          <div className="css-orbit-fallback">
            <div className="fallback-message">Loading animation...</div>
          </div>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
};

interface OrbitSystem {
  objects: THREE.Mesh[];
  trails: THREE.Line[];
  center: THREE.Vector3;
  radius: number;
  speed: number;
  color: THREE.Color;
  type: 'human' | 'ai';
}

const ThreeJsOrbitAnimation: React.FC<ThreeJsOrbitAnimationProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const orbitSystemsRef = useRef<OrbitSystem[]>([]);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  
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

  // Mouse tracking for gravitational effects
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!mountRef.current) return;
    
    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }, []);

  // Create orbital objects with luxury materials and sophisticated design
  const createOrbitSystem = useCallback((
    type: 'human' | 'ai',
    centerOffset: THREE.Vector3,
    baseRadius: number,
    color: THREE.Color,
    objectCount: number
  ): OrbitSystem => {
    const objects: THREE.Mesh[] = [];
    const trails: THREE.Line[] = [];
    
    for (let i = 0; i < objectCount; i++) {
      // Create sophisticated geometric shapes with higher detail
      const objectType = Math.random();
      let geometry: THREE.BufferGeometry;
      
      if (objectType < 0.25) {
        // Premium crystalline structures
        geometry = new THREE.OctahedronGeometry(0.6, 1);
      } else if (objectType < 0.5) {
        // Luxury spheres with high detail
        geometry = new THREE.SphereGeometry(0.5, 16, 12);
      } else if (objectType < 0.75) {
        // Elegant dodecahedrons
        geometry = new THREE.DodecahedronGeometry(0.4, 0);
      } else {
        // Sophisticated icosahedrons
        geometry = new THREE.IcosahedronGeometry(0.5, 1);
      }
      
      // Create premium materials with metallic and glass-like finishes
      let material: THREE.Material;
      
      if (type === 'human') {
        // Human system: Warm luxury materials (gold, copper, amber)
        const materialType = Math.random();
        if (materialType < 0.4) {
          // Metallic gold finish
          material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xffd700).multiplyScalar(0.9),
            metalness: 0.9,
            roughness: 0.1,
            emissive: new THREE.Color(0xff8c42).multiplyScalar(0.05),
            transparent: true,
            opacity: 0.95
          });
        } else if (materialType < 0.7) {
          // Copper/bronze finish
          material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xb87333).multiplyScalar(1.1),
            metalness: 0.8,
            roughness: 0.2,
            emissive: new THREE.Color(0xff6b35).multiplyScalar(0.08),
            transparent: true,
            opacity: 0.9
          });
        } else {
          // Amber crystal finish
          material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0xffbf00),
            metalness: 0.1,
            roughness: 0.05,
            transmission: 0.3,
            thickness: 0.5,
            emissive: new THREE.Color(0xff8c42).multiplyScalar(0.1),
            transparent: true,
            opacity: 0.85
          });
        }
      } else {
        // AI system: Cool luxury materials (platinum, sapphire, diamond)
        const materialType = Math.random();
        if (materialType < 0.4) {
          // Platinum finish
          material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0xe5e4e2).multiplyScalar(1.1),
            metalness: 0.95,
            roughness: 0.05,
            emissive: new THREE.Color(0x06b6d4).multiplyScalar(0.06),
            transparent: true,
            opacity: 0.95
          });
        } else if (materialType < 0.7) {
          // Sapphire blue metallic
          material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x0f4c75).multiplyScalar(1.3),
            metalness: 0.85,
            roughness: 0.15,
            emissive: new THREE.Color(0x06b6d4).multiplyScalar(0.08),
            transparent: true,
            opacity: 0.9
          });
        } else {
          // Diamond crystal finish
          material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0xffffff),
            metalness: 0.0,
            roughness: 0.0,
            transmission: 0.4,
            thickness: 0.3,
            ior: 2.4,
            emissive: new THREE.Color(0x06b6d4).multiplyScalar(0.05),
            transparent: true,
            opacity: 0.8
          });
        }
      }
      
      const object = new THREE.Mesh(geometry, material);
      
      // Position objects in orbital rings
      const angle = (i / objectCount) * Math.PI * 2;
      const radiusVariation = baseRadius + (Math.random() - 0.5) * baseRadius * 0.3;
      const heightVariation = (Math.random() - 0.5) * 2;
      
      object.position.set(
        centerOffset.x + Math.cos(angle) * radiusVariation,
        centerOffset.y + heightVariation,
        centerOffset.z + Math.sin(angle) * radiusVariation
      );
      
      // Store orbital properties
      object.userData = {
        originalRadius: radiusVariation,
        angle: angle,
        speed: (0.5 + Math.random() * 0.5) * (type === 'ai' ? 1.2 : 0.8),
        heightOffset: heightVariation,
        originalY: centerOffset.y + heightVariation,
        type: type
      };
      
      objects.push(object);
      
      // Create sophisticated particle trails with premium effects
      const trailGeometry = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(90); // 30 points * 3 coordinates for smoother trails
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      
      // Premium trail materials with gradient effects
      const trailMaterial = new THREE.LineBasicMaterial({
        color: type === 'human' ?
          new THREE.Color(0xffd700).multiplyScalar(0.6) :
          new THREE.Color(0x06b6d4).multiplyScalar(0.7),
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        linewidth: 2
      });
      
      const trail = new THREE.Line(trailGeometry, trailMaterial);
      trail.userData = { positions: [], maxLength: 30 };
      trails.push(trail);
    }
    
    return {
      objects,
      trails,
      center: centerOffset,
      radius: baseRadius,
      speed: type === 'ai' ? 1.0 : 0.8,
      color,
      type
    };
  }, []);

  // Initialize Three.js scene
  const initThreeJS = useCallback(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);
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
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Premium lighting setup for luxury appearance
    const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.2);
    scene.add(ambientLight);

    // Main directional light with soft shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(15, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.bias = -0.0001;
    scene.add(directionalLight);

    // Luxury accent lights positioned behind text areas
    const humanLight = new THREE.PointLight(0xffd700, 1.5, 25);
    humanLight.position.set(-8, 2, -3); // Behind "Human Competence" text
    humanLight.castShadow = true;
    scene.add(humanLight);

    const aiLight = new THREE.PointLight(0x00d4ff, 1.5, 25);
    aiLight.position.set(8, 2, -3); // Behind "AI Core Intelligence" text
    aiLight.castShadow = true;
    scene.add(aiLight);

    // Additional rim lighting for premium effect
    const rimLight1 = new THREE.DirectionalLight(0xffd700, 0.3);
    rimLight1.position.set(-10, 0, -10);
    scene.add(rimLight1);

    const rimLight2 = new THREE.DirectionalLight(0x00d4ff, 0.3);
    rimLight2.position.set(10, 0, -10);
    scene.add(rimLight2);

    // Atmospheric fog for depth
    scene.fog = new THREE.Fog(0x0a0a0a, 20, 50);

    // Create orbital systems positioned behind their corresponding text
    const humanSystem = createOrbitSystem(
      'human',
      new THREE.Vector3(-8, 0, -5), // Positioned behind "Human Competence" text (left side)
      4,
      new THREE.Color(0xffd700), // Gold/yellow color to match text positioning
      12
    );

    const aiSystem = createOrbitSystem(
      'ai',
      new THREE.Vector3(8, 0, -5), // Positioned behind "AI Core Intelligence" text (right side)
      4,
      new THREE.Color(0x06b6d4), // Cool cyan/blue color
      12
    );

    orbitSystemsRef.current = [humanSystem, aiSystem];

    // Add objects to scene
    [...humanSystem.objects, ...aiSystem.objects].forEach(obj => {
      scene.add(obj);
      obj.castShadow = true;
      obj.receiveShadow = true;
    });

    // Add trails to scene
    [...humanSystem.trails, ...aiSystem.trails].forEach(trail => {
      scene.add(trail);
    });

    // Create connecting lines between systems
    const connectionGeometry = new THREE.BufferGeometry();
    const connectionPositions = new Float32Array(6); // 2 points * 3 coordinates
    connectionGeometry.setAttribute('position', new THREE.BufferAttribute(connectionPositions, 3));
    
    const connectionMaterial = new THREE.LineBasicMaterial({
      color: 0x666666,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });
    
    const connectionLine = new THREE.Line(connectionGeometry, connectionMaterial);
    scene.add(connectionLine);

    // Create refined radial burst effect with 50% fewer lines for cleaner aesthetic
    const createLuxuryRadialBurst = (center: THREE.Vector3, color: THREE.Color, type: 'human' | 'ai') => {
      const burstGroup = new THREE.Group();
      
      // Create multiple layers of radial lines for depth (reduced by 50%)
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 16; i++) { // Reduced from 32 to 16 lines per layer
          const angle = (i / 16) * Math.PI * 2 + (layer * 0.1);
          const length = 12 + Math.random() * 6 + (layer * 2);
          const heightVariation = (Math.random() - 0.5) * 3;
          
          const geometry = new THREE.BufferGeometry();
          const positions = new Float32Array([
            center.x, center.y, center.z,
            center.x + Math.cos(angle) * length,
            center.y + heightVariation,
            center.z + Math.sin(angle) * length
          ]);
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          
          // Premium line materials with metallic appearance
          const lineColor = type === 'human' ?
            new THREE.Color(0xffd700).multiplyScalar(0.4 + layer * 0.1) :
            new THREE.Color(0x00d4ff).multiplyScalar(0.4 + layer * 0.1);
            
          const material = new THREE.LineBasicMaterial({
            color: lineColor,
            transparent: true,
            opacity: (0.15 + Math.random() * 0.15) * (1 - layer * 0.2),
            blending: THREE.AdditiveBlending,
            linewidth: 1 + layer * 0.5
          });
          
          const line = new THREE.Line(geometry, material);
          line.userData = {
            originalOpacity: material.opacity,
            layer: layer,
            angle: angle
          };
          burstGroup.add(line);
        }
      }
      
      return burstGroup;
    };

    const humanBurst = createLuxuryRadialBurst(humanSystem.center, humanSystem.color, 'human');
    const aiBurst = createLuxuryRadialBurst(aiSystem.center, aiSystem.color, 'ai');
    scene.add(humanBurst);
    scene.add(aiBurst);

    // Add atmospheric particles for premium ambiance
    const createAtmosphericParticles = () => {
      const particleCount = 200;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 60;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        
        // Mix of gold and cyan particles
        const isGold = Math.random() > 0.5;
        if (isGold) {
          colors[i * 3] = 1.0;     // R
          colors[i * 3 + 1] = 0.84; // G
          colors[i * 3 + 2] = 0.0;  // B
        } else {
          colors[i * 3] = 0.0;     // R
          colors[i * 3 + 1] = 0.83; // G
          colors[i * 3 + 2] = 1.0;  // B
        }
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const material = new THREE.PointsMaterial({
        size: 0.1,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      });
      
      const particles = new THREE.Points(geometry, material);
      return particles;
    };

    const atmosphericParticles = createAtmosphericParticles();
    scene.add(atmosphericParticles);

    setIsLoaded(true);
  }, [createOrbitSystem]);

  // Animation loop
  const animate = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    const deltaTime = clockRef.current.getDelta();
    const elapsedTime = clockRef.current.getElapsedTime();

    // Enhanced orbital systems animation with luxury timing
    orbitSystemsRef.current.forEach((system, systemIndex) => {
      system.objects.forEach((object, objectIndex) => {
        const userData = object.userData;
        
        // Sophisticated orbital motion with easing
        if (!reducedMotion) {
          // Use different easing curves for human vs AI systems
          const easingFactor = system.type === 'human' ?
            Math.sin(elapsedTime * 0.3 + objectIndex * 0.5) * 0.1 + 1 : // Organic easing
            1 + Math.cos(elapsedTime * 0.4 + objectIndex * 0.3) * 0.05; // Precise easing
          
          userData.angle += deltaTime * userData.speed * system.speed * 0.15 * easingFactor;
        }
        
        // Enhanced mouse gravitational effect with smooth falloff
        const mouseInfluence = new THREE.Vector3(
          mouseRef.current.x * 3,
          -mouseRef.current.y * 3,
          0
        );
        
        const distanceToMouse = object.position.distanceTo(mouseInfluence);
        const gravitationalPull = Math.max(0, 1 - distanceToMouse / 15) * 0.4;
        const smoothPull = gravitationalPull * gravitationalPull; // Quadratic falloff for smoother effect
        
        // Calculate position with sophisticated height variation
        const heightWave = Math.sin(elapsedTime * 0.4 + objectIndex * 0.8) * 0.8;
        const depthWave = Math.cos(elapsedTime * 0.3 + objectIndex * 0.6) * 0.3;
        
        const baseX = system.center.x + Math.cos(userData.angle) * userData.originalRadius;
        const baseZ = system.center.z + Math.sin(userData.angle) * userData.originalRadius + depthWave;
        const baseY = userData.originalY + heightWave;
        
        object.position.set(
          baseX + mouseInfluence.x * smoothPull,
          baseY + mouseInfluence.y * smoothPull * 0.6,
          baseZ
        );
        
        // Sophisticated rotation with material-based variations
        if (!reducedMotion) {
          const rotationSpeed = system.type === 'ai' ? 0.8 : 0.6;
          object.rotation.x += deltaTime * rotationSpeed * (0.8 + Math.sin(elapsedTime + objectIndex) * 0.2);
          object.rotation.y += deltaTime * rotationSpeed * 0.5;
          if (system.type === 'ai') {
            object.rotation.z += deltaTime * rotationSpeed * 0.3;
          }
          
          // Dynamic material properties for luxury effect
          if (object.material instanceof THREE.MeshStandardMaterial ||
              object.material instanceof THREE.MeshPhysicalMaterial) {
            const pulseIntensity = 0.05 + Math.sin(elapsedTime * 2 + objectIndex) * 0.02;
            object.material.emissiveIntensity = pulseIntensity;
          }
        }
        
        // Update trails
        const trail = system.trails[objectIndex];
        if (trail && trail.userData) {
          trail.userData.positions.push(object.position.clone());
          if (trail.userData.positions.length > trail.userData.maxLength) {
            trail.userData.positions.shift();
          }
          
          const positions = trail.geometry.attributes.position.array as Float32Array;
          trail.userData.positions.forEach((pos: THREE.Vector3, i: number) => {
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;
          });
          trail.geometry.attributes.position.needsUpdate = true;
        }
      });
    });

    // Sophisticated convergence animation with luxury timing
    const convergenceWave = Math.sin(elapsedTime * 0.08) * 0.6;
    const convergenceEase = convergenceWave * convergenceWave * Math.sign(convergenceWave); // Cubic easing
    
    orbitSystemsRef.current.forEach((system, index) => {
      const direction = index === 0 ? 1 : -1;
      system.objects.forEach(object => {
        object.position.x += convergenceEase * direction * 0.12;
      });
    });

    // Elegant camera movement with cinematic feel
    if (!reducedMotion) {
      const cameraRadius = 2.5;
      const cameraHeight = 1.2;
      cameraRef.current.position.x = Math.sin(elapsedTime * 0.08) * cameraRadius;
      cameraRef.current.position.y = 5 + Math.cos(elapsedTime * 0.12) * cameraHeight;
      cameraRef.current.position.z = 15 + Math.sin(elapsedTime * 0.06) * 1;
      
      // Smooth camera target with slight drift
      const targetX = Math.sin(elapsedTime * 0.05) * 0.5;
      const targetY = Math.cos(elapsedTime * 0.07) * 0.3;
      cameraRef.current.lookAt(targetX, targetY, 0);
    }

    // Animate atmospheric particles
    if (sceneRef.current) {
      sceneRef.current.traverse((child) => {
        if (child instanceof THREE.Points) {
          child.rotation.y += deltaTime * 0.02;
          child.rotation.x += deltaTime * 0.01;
        }
      });
    }

    // Animate radial burst lines with luxury pulsing
    if (sceneRef.current) {
      sceneRef.current.traverse((child) => {
        if (child instanceof THREE.Line && child.userData.layer !== undefined) {
          const pulse = Math.sin(elapsedTime * 1.5 + child.userData.angle * 2) * 0.3 + 0.7;
          if (child.material instanceof THREE.LineBasicMaterial) {
            child.material.opacity = child.userData.originalOpacity * pulse;
          }
        }
      });
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
    initThreeJS();
    
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
  }, [initThreeJS, handleResize, handleMouseMove]);

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