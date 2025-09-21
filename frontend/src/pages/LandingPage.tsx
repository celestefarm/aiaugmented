import React from 'react';
import '../styles/landing.css';
import '../styles/orbit-animation.css';
import LandingPageHeader from '../components/LandingPageHeader';
import ThreeJsOrbitAnimation from '../components/ThreeJsOrbitAnimation';

const LandingPage: React.FC = () => {
  return (
    <>
      <LandingPageHeader />
      <div className="landing-container relative min-h-screen">
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
      
      {/* Pain Points Section - Now below the hero */}
      <section className="pain-points-section w-full max-w-6xl mx-auto mb-16 px-4">
        <div className="text-center mb-12">
          <h2 className="section-title mb-6">The Hidden Struggles You Face Every Day</h2>
          <p className="text-lg text-gray-300 max-w-4xl mx-auto leading-relaxed opacity-90">
            We see the weight you carry—the unspoken fears that keep you awake at 3 AM, the moments of doubt that creep in during important meetings, and the exhausting effort to stay relevant in a world that seems to be moving faster than you can adapt.
          </p>
        </div>
        
        <div className="pain-points-grid grid md:grid-cols-2 gap-8">
          <div className="pain-point-card">
            <h3 className="pain-title">The Quiet Crisis of Professional Identity</h3>
            <p className="pain-description mb-4">
              <em>"After building my expertise over decades, am I becoming irrelevant overnight?"</em>
            </p>
            <p className="pain-description">
              You've spent years cultivating deep knowledge, developing intuition, and earning respect through hard-won experience. Now you watch as AI tools produce in minutes what once took you days to perfect. The question haunts you: <strong>Is my accumulated wisdom just expensive overhead in an automated world?</strong>
            </p>
            <p className="pain-description mt-3 text-sm opacity-75">
              <strong>The ripple effect is real:</strong> You hesitate in strategy meetings. You over-research simple decisions. You find yourself apologizing for approaches that have served you well for years.
            </p>
          </div>
          
          <div className="pain-point-card">
            <h3 className="pain-title">The Imposter Syndrome Amplification</h3>
            <p className="pain-description mb-4">
              <em>"What if they realize I don't understand this AI-driven world as well as I pretend to?"</em>
            </p>
            <p className="pain-description">
              You've mastered the art of nodding knowingly when colleagues discuss the latest AI breakthrough, but inside, you're drowning. Every day brings new tools, new capabilities, new ways of working that make you feel like a fraud in your own field.
            </p>
            <p className="pain-description mt-3 text-sm opacity-75">
              <strong>The isolation is crushing:</strong> You can't admit your struggles to your team—they look to you for leadership. You can't confess to your peers—they seem to be adapting effortlessly.
            </p>
          </div>
          
          <div className="pain-point-card">
            <h3 className="pain-title">The Relevance Anxiety That Follows You Home</h3>
            <p className="pain-description mb-4">
              <em>"How long before someone realizes they can replace me with a junior person and an AI subscription?"</em>
            </p>
            <p className="pain-description">
              You've seen the headlines. You've watched entire departments get "optimized." You know that your salary could fund three junior hires plus enterprise AI tools. The math is simple, and it terrifies you.
            </p>
            <p className="pain-description mt-3 text-sm opacity-75">
              <strong>The career anxiety is paralyzing:</strong> You avoid applying for new roles because you're afraid of AI-powered screening systems. You hesitate to negotiate because you feel lucky to still be employed.
            </p>
          </div>
          
          <div className="pain-point-card">
            <h3 className="pain-title">The Exhausting Performance of Adaptation</h3>
            <p className="pain-description mb-4">
              <em>"I'm drowning in the effort to appear effortlessly current with every new development."</em>
            </p>
            <p className="pain-description">
              You subscribe to AI newsletters you barely understand. You attend webinars about tools you'll never use. You nod along in conversations about machine learning while mentally translating everything into concepts you actually grasp.
            </p>
            <p className="pain-description mt-3 text-sm opacity-75">
              <strong>The hidden costs are mounting:</strong> You're spending weekends trying to learn technologies that will be obsolete by the time you master them. You're burning out from the constant pressure to reinvent yourself.
            </p>
          </div>
        </div>
        
        <div className="text-center mt-12 max-w-4xl mx-auto">
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
            <h4 className="text-xl font-semibold text-white mb-3">The Unspoken Truth</h4>
            <p className="text-gray-300 leading-relaxed mb-4">
              These struggles aren't signs of weakness—they're the natural response of accomplished professionals facing unprecedented change. You're not falling behind; you're navigating uncharted territory without a map.
            </p>
            <p className="text-gray-300 leading-relaxed">
              <strong className="text-white">The real tragedy isn't that AI is changing your industry. It's that you're facing this transformation alone, in silence, believing that everyone else has figured it out while you're still struggling.</strong>
            </p>
            <div className="mt-4 pt-4 border-t border-gray-700/50">
              <p className="text-gray-400 italic">
                What if instead of competing with AI, you could collaborate with it? What if instead of replacing your expertise, you could amplify it?
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section - Also below the hero */}
      <section className="solutions-section w-full max-w-6xl mx-auto mb-16 px-4">
        <h2 className="section-title text-center mb-12">Intelligent Solutions That Transform Leadership</h2>
        <div className="solutions-grid grid md:grid-cols-2 gap-12">
          <div className="solution-card">
            <div className="solution-icon">🧠</div>
            <h3 className="solution-title">AI-Powered Strategic Intelligence</h3>
            <p className="solution-description">
              Cut through information overload with AI that synthesizes complex data into clear, actionable insights. Get the strategic clarity you need in minutes, not hours.
            </p>
            <ul className="solution-benefits">
              <li>Real-time market intelligence synthesis</li>
              <li>Automated competitive analysis</li>
              <li>Risk assessment with predictive modeling</li>
            </ul>
          </div>
          
          <div className="solution-card">
            <div className="solution-icon">⚡</div>
            <h3 className="solution-title">Decision Acceleration Engine</h3>
            <p className="solution-description">
              Transform decision paralysis into confident action. AI-driven scenario modeling and impact analysis that shows you the path forward with clarity.
            </p>
            <ul className="solution-benefits">
              <li>Multi-scenario impact modeling</li>
              <li>Stakeholder alignment optimization</li>
              <li>Decision confidence scoring</li>
            </ul>
          </div>
          
          <div className="solution-card">
            <div className="solution-icon">🎯</div>
            <h3 className="solution-title">Strategic Execution Orchestrator</h3>
            <p className="solution-description">
              Bridge the gap between strategy and execution. AI-powered project orchestration that ensures your vision becomes reality through intelligent coordination.
            </p>
            <ul className="solution-benefits">
              <li>Automated progress tracking</li>
              <li>Resource optimization algorithms</li>
              <li>Bottleneck prediction and resolution</li>
            </ul>
          </div>
          
          <div className="solution-card">
            <div className="solution-icon">🚀</div>
            <h3 className="solution-title">Executive Time Multiplier</h3>
            <p className="solution-description">
              Reclaim your strategic thinking time. AI assistants that handle routine analysis, meeting prep, and stakeholder communication, freeing you for high-impact decisions.
            </p>
            <ul className="solution-benefits">
              <li>Intelligent meeting preparation</li>
              <li>Automated report generation</li>
              <li>Priority-based task orchestration</li>
            </ul>
          </div>
        </div>
        
        <div className="cta-section text-center mt-16">
          <h3 className="cta-title">Ready to Transform Your Leadership?</h3>
          <p className="cta-description">
            Join forward-thinking executives who've already multiplied their strategic impact with AI-powered intelligence.
          </p>
          <button className="cta-button">
            Experience the Future of Strategic Leadership
          </button>
        </div>
      </section>
    </>
  );
};

export default LandingPage;