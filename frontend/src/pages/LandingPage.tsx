import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/landing.css';
import '../styles/orbit-animation.css';
import LandingPageHeader from '../components/LandingPageHeader';
import ThreeJsOrbitAnimation from '../components/ThreeJsOrbitAnimation';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // Disable automatic redirect to allow landing page to be viewed by all users
  // Authentication redirect is handled by other routes if needed

  // Background text animation effect with robust initialization
  useEffect(() => {
    console.log('🎬 Animation effect starting...'); // Debug log
    
    let isComponentMounted = true;
    let animationInterval: NodeJS.Timeout | null = null;
    let fadeTimeout: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const maxRetries = 10;
    
    const initializeAnimation = () => {
      if (!isComponentMounted) return;
      
      const sentences = document.querySelectorAll('.animated-sentence');
      console.log('🔍 Found sentences:', sentences.length, 'Retry:', retryCount); // Debug log
      
      if (sentences.length === 0) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(`⚠️ No animated sentences found, retrying in 500ms (${retryCount}/${maxRetries})`);
          setTimeout(initializeAnimation, 500);
          return;
        } else {
          console.error('❌ Failed to find animated sentences after maximum retries');
          return;
        }
      }

      console.log('✅ Animation initialization successful!');
      let currentIndex = 0;

      const showSentence = (index: number) => {
        if (!isComponentMounted) {
          console.log('🛑 Component unmounted, skipping sentence show'); // Debug log
          return;
        }

        console.log(`🎭 Showing sentence ${index + 1}/${sentences.length}`); // Debug log
        
        // Clear any existing fade timeout
        if (fadeTimeout) {
          clearTimeout(fadeTimeout);
          fadeTimeout = null;
        }
        
        // Hide all sentences first with immediate effect
        sentences.forEach((sentence, i) => {
          const element = sentence as HTMLElement;
          element.style.opacity = '0';
          element.style.transition = 'opacity 0.8s ease-in-out';
          if (i === index) {
            console.log('📝 Current sentence text:', element.textContent?.substring(0, 50) + '...'); // Debug log
          }
        });

        // Show current sentence with fade-in after ensuring fade-out completes
        const currentSentence = sentences[index] as HTMLElement;
        if (currentSentence && isComponentMounted) {
          fadeTimeout = setTimeout(() => {
            if (isComponentMounted && currentSentence) {
              currentSentence.style.opacity = '1';
              console.log('✨ Sentence faded in successfully'); // Debug log
            }
          }, 100); // Shorter delay for smoother transition
        }
      };

      const animateSentences = () => {
        if (!isComponentMounted) {
          console.log('🛑 Component unmounted, stopping animation'); // Debug log
          return;
        }

        console.log(`🔄 Animation cycle ${currentIndex + 1}, timestamp:`, Date.now()); // Debug log
        
        showSentence(currentIndex);
        
        // Move to next sentence
        currentIndex = (currentIndex + 1) % sentences.length;
      };

      // Start the animation immediately
      console.log('🚀 Starting animation loop...'); // Debug log
      animateSentences();
      
      // Set up interval for continuous animation
      animationInterval = setInterval(() => {
        if (isComponentMounted) {
          animateSentences();
        } else {
          // Clean up if component is unmounted
          if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
          }
        }
      }, 3500); // Change sentence every 3.5 seconds
    };

    // Start initialization with multiple fallback attempts
    const initTimer = setTimeout(initializeAnimation, 100);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up animation resources...'); // Debug log
      isComponentMounted = false;
      
      // Clear all timers
      clearTimeout(initTimer);
      
      if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
      }
      
      if (fadeTimeout) {
        clearTimeout(fadeTimeout);
        fadeTimeout = null;
      }
      
      // Reset all sentence opacities to prevent visual artifacts
      const sentences = document.querySelectorAll('.animated-sentence');
      sentences.forEach((sentence) => {
        const element = sentence as HTMLElement;
        element.style.opacity = '0';
        element.style.transition = 'none';
      });
    };
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Only show landing page for unauthenticated users
  return (
    <>
      <LandingPageHeader />
      <div className="landing-container relative min-h-screen bg-black">
        {/* Three.js Orbit Animation Background */}
        <ThreeJsOrbitAnimation className="threejs-canvas" />
        
        {/* Text overlay on top of the 3D animation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-overlay-container">
            {/* "HUMAN / COMPETENCE" text positioned on the left */}
            <div className="text-3d understand-text">
              <span className="text-word">Human</span>
              <span className="text-word">Competence</span>
            </div>
            
            {/* Central "x" between the text labels - removed */}
            
            {/* "AI CORE / INTELLIGENCE" text positioned on the right */}
            <div className="text-3d universe-text">
              <span className="text-word">AI Core</span>
              <span className="text-word">Intelligence</span>
            </div>
          </div>
        </div>
        
        <div className="landing-content relative z-20 flex flex-col items-center justify-center min-h-screen">
          {/* Hero section spacer - this keeps the text overlay centered */}
        </div>
      </div>

      {/* Luxury Prestige Section */}
      <section className="w-full bg-black py-32 px-4 luxury-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center luxury-content">
            <h2 className="luxury-headline mb-8">
              AI Intelligence. Human Wisdom.<br />
              <span className="luxury-headline-accent">An Unassailable Advantage</span>
            </h2>
            <p className="luxury-subtitle mb-12">
              For the leader who must be certain in a world of constant ambiguity
            </p>
            <div className="luxury-body-text max-w-4xl mx-auto mb-12">
              <p className="mb-6">
                You stand at the confluence of immense data and irreversible consequence. Every report offers a different version of the truth. Every advisor, a different path forward. In this deafening noise, you know the greatest risk is not in the information you have, but in the silent, unseen narrative you might be missing, the single insight that could define your legacy or seal your fate.
              </p>
            </div>
            <div className="flex justify-center">
              <p className="luxury-closing">
                This is the loneliness of command. And it is where we meet you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 - Black background with animated text - Reduced size */}
      <section className="w-full bg-black py-48 px-4 relative overflow-hidden">
        {/* Background animated text */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="background-text-animation">
            <div className="animated-sentence position-1" data-sentence="0">Am I just a glorified prompt engineer, or am I still a true expert in my field?</div>
            <div className="animated-sentence position-2" data-sentence="1">How can I compete with a junior who can get a perfect answer from an AI in seconds when it takes me days of research?</div>
            <div className="animated-sentence position-3" data-sentence="2">How do I tell my boss I'm still valuable when an AI tool is doing the work that once defined me?</div>
            <div className="animated-sentence position-4" data-sentence="3">Am I becoming an unnecessary bottleneck by trying to perfect something an AI could have done in minutes?</div>
            <div className="animated-sentence position-5" data-sentence="4">Are my skills in danger of becoming as obsolete as a fax machine?</div>
            <div className="animated-sentence position-6" data-sentence="5">Is my job secure, or am I a few prompts away from being replaced?</div>
            <div className="animated-sentence position-7" data-sentence="6">Will my resume get filtered out by an AI-powered hiring system that sees my age as a weakness?</div>
            <div className="animated-sentence position-8" data-sentence="7">Why do I feel so much shame when I have to ask a younger colleague for help with an AI tool?</div>
            <div className="animated-sentence position-9" data-sentence="8">How do I showcase my unique value to a company when so many of my past achievements can be automated?</div>
            <div className="animated-sentence position-10" data-sentence="9">How can I possibly keep up with the overwhelming pace of technological change?</div>
            <div className="animated-sentence position-11" data-sentence="10">Am I losing my place in the professional landscape because I'm not fluent in AI and other new technologies?</div>
            <div className="animated-sentence position-12" data-sentence="11">Is it my responsibility to manage the ethical implications of the AI tools my team uses, and am I prepared for that?</div>
            <div className="animated-sentence position-13" data-sentence="12">Why do I hesitate to ask for more training for my team on new tools, even when I know we need it?</div>
            <div className="animated-sentence position-14" data-sentence="13">Does all my accumulated wisdom and "gut feeling" matter anymore, or is it just a novelty?</div>
            <div className="animated-sentence position-15" data-sentence="14">Is my entire professional identity, built over decades, at risk because of AI?</div>
            <div className="animated-sentence position-16" data-sentence="15">Is my career path inevitably shifting away from hands-on work toward being a pure manager?</div>
            <div className="animated-sentence position-17" data-sentence="16">Why do I feel like I have to be an expert in both my original field and every new AI technology?</div>
            <div className="animated-sentence position-18" data-sentence="17">Am I afraid to pursue new opportunities because I might have to learn a new AI tool and fail?</div>
            <div className="animated-sentence position-19" data-sentence="18">Why do I feel like any negative feedback is confirmation that I'm a fraud?</div>
          </div>
        </div>
        
      </section>

      {/* Section 3 - Black background */}
      <section className="w-full bg-black py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-white mb-8">Section Three</h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              This is the third section with a black background. Ideal for call-to-action content, contact information, or final messaging.
            </p>
          </div>
        </div>
      </section>
      
    </>
  );
};

export default LandingPage;