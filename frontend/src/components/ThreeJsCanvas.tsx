import React, { useEffect, useRef } from 'react';

// Declare THREE as a global variable for CDN usage
declare global {
  interface Window {
    THREE: any;
  }
}

const ThreeJsCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const animationIdRef = useRef<number>();

  useEffect(() => {
    const loadThreeJs = () => {
      return new Promise((resolve, reject) => {
        // Check if Three.js is already loaded
        if (window.THREE) {
          resolve(window.THREE);
          return;
        }

        // Create script element to load Three.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r172/three.min.js';
        script.onload = () => {
          if (window.THREE) {
            resolve(window.THREE);
          } else {
            reject(new Error('Three.js failed to load'));
          }
        };
        script.onerror = () => reject(new Error('Failed to load Three.js script'));
        document.head.appendChild(script);
      });
    };

    const initThreeJs = async () => {
      try {
        // Load Three.js from CDN
        const THREE: any = await loadThreeJs();
        
        if (!canvasRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0a); // Dark background to match existing design

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
          75,
          window.innerWidth / window.innerHeight,
          0.1,
          1000
        );
        camera.position.z = 5;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          antialias: true,
          alpha: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Create orbital objects
        const objects: any[] = [];
        const orbits: any[] = [];

        // Create multiple orbital rings
        for (let ring = 0; ring < 3; ring++) {
          const radius = 2 + ring * 1.5;
          const objectCount = 8 + ring * 4;
          
          for (let i = 0; i < objectCount; i++) {
            // Create different geometric shapes
            let geometry;
            const shapeType = Math.floor(Math.random() * 4);
            
            switch (shapeType) {
              case 0:
                geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
                break;
              case 1:
                geometry = new THREE.SphereGeometry(0.05, 8, 6);
                break;
              case 2:
                geometry = new THREE.ConeGeometry(0.05, 0.15, 6);
                break;
              default:
                geometry = new THREE.OctahedronGeometry(0.08);
            }

            // Create materials with colors matching the existing design
            const colors = [0x06b6d4, 0x3b82f6, 0x9ca3af, 0xffffff];
            const material = new THREE.MeshBasicMaterial({
              color: colors[Math.floor(Math.random() * colors.length)],
              transparent: true,
              opacity: 0.8
            });

            const mesh = new THREE.Mesh(geometry, material);
            
            // Position objects in orbital rings
            const angle = (i / objectCount) * Math.PI * 2;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.y = Math.sin(angle) * radius;
            mesh.position.z = (Math.random() - 0.5) * 2;

            scene.add(mesh);
            objects.push({
              mesh,
              ring,
              angle: angle,
              radius: radius,
              speed: 0.001 + ring * 0.0005,
              originalY: mesh.position.y
            });
          }
        }

        // Add ambient lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);

        // Remove the central point light to eliminate the glowing object in the middle
        // const pointLight = new THREE.PointLight(0x06b6d4, 1, 100);
        // pointLight.position.set(0, 0, 10);
        // scene.add(pointLight);

        // Store references
        sceneRef.current = scene;
        rendererRef.current = renderer;

        // Animation loop
        const animate = () => {
          animationIdRef.current = requestAnimationFrame(animate);

          // Rotate objects around their orbits
          objects.forEach((obj) => {
            obj.angle += obj.speed;
            obj.mesh.position.x = Math.cos(obj.angle) * obj.radius;
            obj.mesh.position.y = Math.sin(obj.angle) * obj.radius + obj.originalY;
            
            // Add subtle rotation to individual objects
            obj.mesh.rotation.x += 0.01;
            obj.mesh.rotation.y += 0.01;
          });

          // Gentle camera movement
          const time = Date.now() * 0.0005;
          camera.position.x = Math.sin(time) * 0.5;
          camera.position.y = Math.cos(time * 0.7) * 0.3;
          camera.lookAt(0, 0, 0);

          renderer.render(scene, camera);
        };

        animate();

        // Add class to indicate Three.js is active (hide fallback)
        const landingContainer = document.querySelector('.landing-container');
        if (landingContainer) {
          landingContainer.classList.add('threejs-active');
        }

        // Handle window resize
        const handleResize = () => {
          if (!camera || !renderer) return;
          
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup function
        return () => {
          window.removeEventListener('resize', handleResize);
          if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
          }
          if (renderer) {
            renderer.dispose();
          }
          // Clean up geometries and materials
          objects.forEach(obj => {
            if (obj.mesh.geometry) obj.mesh.geometry.dispose();
            if (obj.mesh.material) obj.mesh.material.dispose();
          });
          // Remove the active class on cleanup
          const landingContainer = document.querySelector('.landing-container');
          if (landingContainer) {
            landingContainer.classList.remove('threejs-active');
          }
        };

      } catch (error) {
        console.error('Failed to initialize Three.js:', error);
        // Hide the canvas and let CSS animation show
        if (canvasRef.current) {
          canvasRef.current.style.display = 'none';
        }
        // Ensure the CSS animation is visible by not adding the threejs-active class
        const landingContainer = document.querySelector('.landing-container');
        if (landingContainer) {
          landingContainer.classList.remove('threejs-active');
        }
      }
    };

    initThreeJs();

    // Cleanup on unmount
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'none',
        cursor: 'auto'
      }}
    />
  );
};

export default ThreeJsCanvas;