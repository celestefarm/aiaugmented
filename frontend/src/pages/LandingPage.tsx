import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/landing.css';
import '../styles/orbit-animation.css';
import LandingPageHeader from '../components/LandingPageHeader';
import ThreeJsOrbitAnimation from '../components/ThreeJsOrbitAnimation';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);

  // Disable automatic redirect to allow landing page to be viewed by all users
  // Authentication redirect is handled by other routes if needed

  const handleOpenLogin = () => {
    console.log('DEBUG: Opening sign-in modal from landing page button');
    setIsLoginOpen(true);
  };

  const handleOpenSignup = () => {
    console.log('DEBUG: Opening sign-up modal from landing page button');
    setIsSignupOpen(true);
  };

  const handleCloseLogin = () => {
    setIsLoginOpen(false);
  };

  const handleCloseSignup = () => {
    setIsSignupOpen(false);
  };

  const toggleDropdown = (dropdownId: string) => {
    setExpandedDropdown(expandedDropdown === dropdownId ? null : dropdownId);
  };


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
      <LandingPageHeader
        isLoginOpen={isLoginOpen}
        isSignupOpen={isSignupOpen}
        onLoginOpen={handleOpenLogin}
        onSignupOpen={handleOpenSignup}
        onLoginClose={handleCloseLogin}
        onSignupClose={handleCloseSignup}
      />
      <div className="landing-container relative h-screen bg-black">
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
        
        <div className="landing-content relative z-20 flex flex-col items-center justify-center h-full">
          {/* Hero section spacer - this keeps the text overlay centered */}
        </div>
      </div>

      {/* Hero Section - AI Intelligence Human Wisdom */}
      <section className="w-full bg-black py-32 px-4 hero-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center hero-content">
            <h1 className="hero-main-title mb-6">
              AI Intelligence.<br />Human Wisdom.
            </h1>
            <h2 className="hero-subtitle mb-8">
              An Unassailable Advantage
            </h2>
            <p className="hero-description mb-12">
              For the leader who must manufacture certainty from deafening noise
            </p>
            <div className="flex justify-center">
              <button
                className="hero-cta-button"
                onClick={handleOpenLogin}
              >
                Begin Your Strategic Advantage
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* The New Loneliness of Command Section */}
      <section className="w-full bg-black py-32 px-4 loneliness-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center loneliness-content">
            <h2 className="loneliness-headline mb-8">
              The New Loneliness of Command
            </h2>
            <div className="loneliness-body-text max-w-4xl mx-auto mb-12">
              <p className="mb-6">
                You have more data than ever, yet less certainty. Surrounded by noise, you know the career-defining decision is still yours alone. Your greatest risk isn't the information you have, but the single, unseen insight that will determine your legacy.
              </p>
            </div>
            <div className="flex justify-center">
              <p className="loneliness-closing">
                This is the new loneliness of command in the age of AI. And it is where we meet you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Widening Chasm Section */}
      <section className="w-full bg-black py-32 px-4 widening-chasm-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="chasm-main-title mb-4">
              The Widening Chasm
            </h2>
            <p className="chasm-subtitle">
              A Three-Stage Trajectory
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Today Column */}
            <div className="chasm-column">
              <div className="chasm-accent-line"></div>
              <h3 className="chasm-column-title">Today</h3>
              <p className="chasm-timeframe">The Next 12 Months</p>
              <h4 className="chasm-column-subtitle">A Crisis of Confidence</h4>
              <p className="chasm-description">
                The threat is internal. The flood of AI-generated data makes your judgment harder, not easier, while your hard-won intuition is dismissed as bias. You're left with a corrosive hesitation on the very decisions that define your role.
              </p>
            </div>
            
            {/* The Near Future Column */}
            <div className="chasm-column">
              <div className="chasm-accent-line"></div>
              <h3 className="chasm-column-title">The Near Future</h3>
              <p className="chasm-timeframe">18-24 Months</p>
              <h4 className="chasm-column-subtitle">A Widening Performance Gap</h4>
              <p className="chasm-description">
                The internal crisis becomes an external reality. Competitors using augmented wisdom will move faster, seizing opportunities you miss. Your strategic mistakes will become more frequent and visible. Your authority, once a given, will now require constant, painful justification in the boardroom.
              </p>
            </div>
            
            {/* The Inevitable Future Column */}
            <div className="chasm-column">
              <div className="chasm-accent-line"></div>
              <h3 className="chasm-column-title">The Inevitable Future</h3>
              <p className="chasm-timeframe">3-5 Years</p>
              <h4 className="chasm-column-subtitle">The Obsolescence Event</h4>
              <p className="chasm-description">
                The gap becomes a chasm. Your experience may be now officially a liability. You are no longer consulted on critical decisions, but simply "managed around." This isn't about a missed promotion. It's about a forced exit and the total erasure of your professional legacy.
              </p>
            </div>
            
          </div>
        </div>
      </section>

      {/* Section 3 - Restoring Your Authority */}
      <section className="w-full bg-black py-32 px-4 authority-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center authority-content">
            <h2 className="authority-title mb-8">
              Restoring Your Authority in an<br />
              <span className="authority-title-accent">AI-Automated World</span>
            </h2>
            <p className="authority-description max-w-4xl mx-auto mb-12">
              The rise of AI is creating a silent crisis of authority for senior leaders. Our system is not another LLM tool or threat, but a partnership. It is a disciplined process designed to amplify your wisdom and fortify your reasoning, transforming doubt into your most defensible asset: conviction.
            </p>
            
            {/* How it works section */}
            <div className="how-it-works-section">
              <h3 className="how-it-works-title mb-12">Here's how it works:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* Step 01 */}
                <div className="process-step">
                  <div className="step-number">01</div>
                  <h4 className="step-title">Define the Crucible Moment</h4>
                  <p className="step-description">
                    First, we anchor the entire process around a single, high-stakes decision or challenge you're facing right now. It could be a career-defining board presentation, a critical market-entry strategy, or a high-pressure M&A negotiation.
                  </p>
                  <div
                    className="step-dropdown"
                    onClick={() => toggleDropdown('step-01')}
                  >
                    <span className="dropdown-text">The Deep Solution</span>
                    <span className={`dropdown-arrow ${expandedDropdown === 'step-01' ? 'expanded' : ''}`}>
                      {expandedDropdown === 'step-01' ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedDropdown === 'step-01' && (
                    <div className="dropdown-content">
                      <p className="dropdown-expanded-text">
                        This isn't about project management; it's an antidote to the overwhelming anxiety of "keeping up." The fear that you must be an expert in everything is replaced by a singular focus. By concentrating your expertise on a "crucible moment," we silence the noise and restore a profound sense of control and purpose. Your relevance is affirmed not by knowing everything, but by mastering what matters most.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Step 02 */}
                <div className="process-step">
                  <div className="step-number">02</div>
                  <h4 className="step-title">Fortify Your Reasoning</h4>
                  <p className="step-description">
                    Once the challenge is set, our system engages you in a disciplined dialogue. It acts as a confidential sparring partner, stress-testing your assumptions, surfacing hidden risks, and challenging you to defend your logic against rigorous, unbiased questioning.
                  </p>
                  <div
                    className="step-dropdown"
                    onClick={() => toggleDropdown('step-02')}
                  >
                    <span className="dropdown-text">The Deep Solution</span>
                    <span className={`dropdown-arrow ${expandedDropdown === 'step-02' ? 'expanded' : ''}`}>
                      {expandedDropdown === 'step-02' ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedDropdown === 'step-02' && (
                    <div className="dropdown-content">
                      <p className="dropdown-expanded-text">
                        This directly confronts the "Imposter Syndrome Amplified by AI." The fear that an AI will "expose your hidden knowledge gaps" is inverted. Here, the system is used in a private, controlled environment to intentionally find those gaps for you. It's a confidential rehearsal designed not to expose you, but to fortify you. It ensures that by the time you face the board or your team, every facet of your argument is battle-tested, turning a source of anxiety into a source of supreme confidence.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Step 03 */}
                <div className="process-step">
                  <div className="step-number">03</div>
                  <h4 className="step-title">Visualise Your Wisdom on the Exploration Map</h4>
                  <p className="step-description">
                    As we work, your entire reasoning process, assumptions, evidence, stakeholder impacts, counterarguments, is captured on a dynamic, visual "Exploration Map." This isn't a mind map of ideas; it's a logical architecture of your decision.
                  </p>
                  <div
                    className="step-dropdown"
                    onClick={() => toggleDropdown('step-03')}
                  >
                    <span className="dropdown-text">The Deep Solution</span>
                    <span className={`dropdown-arrow ${expandedDropdown === 'step-03' ? 'expanded' : ''}`}>
                      {expandedDropdown === 'step-03' ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedDropdown === 'step-03' && (
                    <div className="dropdown-content">
                      <p className="dropdown-expanded-text">
                        This answers the existential question, "Does my accumulated wisdom and 'gut feeling' matter anymore?" The Exploration Map makes your intuition tangible. It takes the abstract connections you've formed over a lifetime of experience and renders them into a structured, defensible framework. It proves that your "gut feel" is not a novelty; it's a complex data-processing system that can now be articulated, defended, and shared with clarity. It preserves your unique insight, shielding it from being dismissed as mere opinion.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Step 04 */}
                <div className="process-step">
                  <div className="step-number">04</div>
                  <h4 className="step-title">Crystallise Your Conviction with the Last-Mile Brief</h4>
                  <p className="step-description">
                    Finally, the system translates this robust, visual strategy into a concise, executive-ready document we call the "Last-Mile Brief." It contains your final decision, the powerful rationale behind it, a clear view of the risks, and the strategic next steps.
                  </p>
                  <div
                    className="step-dropdown"
                    onClick={() => toggleDropdown('step-04')}
                  >
                    <span className="dropdown-text">The Deep Solution</span>
                    <span className={`dropdown-arrow ${expandedDropdown === 'step-04' ? 'expanded' : ''}`}>
                      {expandedDropdown === 'step-04' ? '▲' : '▼'}
                    </span>
                  </div>
                  {expandedDropdown === 'step-04' && (
                    <div className="dropdown-content">
                      <p className="dropdown-expanded-text">
                        This resolves the crisis of professional identity and the fear that you're becoming a "glorified prompt engineer." The brief is the undeniable proof of your value. While an AI was a tool in the process, the final judgment, the narrative, and the ethical considerations woven into the brief are unequivocally yours. It allows you to walk into any room and defend your decision with absolute conviction, because you haven't just arrived at an answer; you have mastered the entire landscape of the problem. Your authority is not just preserved; it is enhanced.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4 - Why Now */}
      <section className="w-full bg-black py-32 px-4 why-now-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center why-now-content">
            <h2 className="why-now-title mb-4">Why Now</h2>
            <div className="why-now-underline mb-8"></div>
            <p className="why-now-subtitle mb-16">
              Because Your 2026 Legacy is Being Forged in the Next 90 Days
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Card 01 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="card-number">01</div>
                  <div className="card-period">2024 - Present</div>
                </div>
                <h3 className="card-title">The Inflection Point</h3>
                <p className="card-description">
                  The era of experimentation is over. The era of accountability has begun.
                </p>
                <div
                  className="card-dropdown"
                  onClick={() => toggleDropdown('why-now-01')}
                >
                  <span className="dropdown-text">Read More</span>
                  <span className={`dropdown-arrow ${expandedDropdown === 'why-now-01' ? 'expanded' : ''}`}>
                    {expandedDropdown === 'why-now-01' ? '▲' : '▼'}
                  </span>
                </div>
                {expandedDropdown === 'why-now-01' && (
                  <div className="dropdown-content">
                    <p className="dropdown-expanded-text">
                      The first wave of the AI revolution has passed. The initial reports have been filed, the productivity gains have been noted, and now a stark silence has fallen in boardrooms across London and the world. It is the silence of expectation. The era of experimentation is definitively over, and the era of accountability has begun.
                    </p>
                    <p className="dropdown-expanded-text">
                      As you enter the final budget and strategy sessions for 2026, the question is no longer "Are we using AI?" It has become a far more personal and penetrating one: "How is your leadership leveraging AI to deliver a defensible, asymmetric advantage?"
                    </p>
                    <p className="dropdown-expanded-text">
                      This is the inflection point, and here's why this moment is so critical.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Card 02 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="card-number">02</div>
                  <div className="card-period">Current Challenge</div>
                </div>
                <h3 className="card-title">The Great Productivity Trap is Snapping Shut</h3>
                <p className="card-description">
                  Your competitors are drowning in machine-generated options while their judgment stalls.
                </p>
                <div
                  className="card-dropdown"
                  onClick={() => toggleDropdown('why-now-02')}
                >
                  <span className="dropdown-text">Read More</span>
                  <span className={`dropdown-arrow ${expandedDropdown === 'why-now-02' ? 'expanded' : ''}`}>
                    {expandedDropdown === 'why-now-02' ? '▲' : '▼'}
                  </span>
                </div>
                {expandedDropdown === 'why-now-02' && (
                  <div className="dropdown-content">
                    <p className="dropdown-expanded-text">
                      Many of your competitors are currently making a fatal error. They are mistaking AI-driven productivity for genuine strategic progress. Their teams are generating flawless reports, detailed models, and brilliant slide decks at an unprecedented rate. But this has created a dangerous illusion of progress.
                    </p>
                    <p className="dropdown-expanded-text">
                      They are drowning in a sea of plausible, machine-generated options. Their speed of output has accelerated, but their quality of judgment has stalled. This is the productivity trap: a race to the bottom where efficiency gains mask a total erosion of strategic differentiation. They are building a faster horse in an age that demands an entirely new form of transport.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Card 03 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="card-number">03</div>
                  <div className="card-period">The Solution</div>
                </div>
                <h3 className="card-title">The New Competitive Moat is Judgment, Not Data</h3>
                <p className="card-description">
                  Select leaders are building the only moat that matters: synthesized intelligence.
                </p>
                <div
                  className="card-dropdown"
                  onClick={() => toggleDropdown('why-now-03')}
                >
                  <span className="dropdown-text">Read More</span>
                  <span className={`dropdown-arrow ${expandedDropdown === 'why-now-03' ? 'expanded' : ''}`}>
                    {expandedDropdown === 'why-now-03' ? '▲' : '▼'}
                  </span>
                </div>
                {expandedDropdown === 'why-now-03' && (
                  <div className="dropdown-content">
                    <p className="dropdown-expanded-text">
                      While they are trapped in the weeds of automation, a select few leaders are quietly building the only competitive moat that will matter in 2026 and beyond. They understand the new paradigm: with information now a universal commodity, the only source of true alpha is the quality, rigour, and courage of human leadership.
                    </p>
                    <p className="dropdown-expanded-text">
                      They are not just using tools; they are architecting a new synthesis of machine intelligence and human wisdom. They are building a decision-making engine that allows them to see what others miss, to move with conviction while others hesitate, and to justify their strategic bets with a level of clarity that is simply unassailable.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Card 04 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="card-number">04</div>
                  <div className="card-period">Your Future</div>
                </div>
                <h3 className="card-title">Your Defining Moment as a Leader is Now</h3>
                <p className="card-description">
                  The strategic plans you commit to by December will define your relevance for years to come.
                </p>
                <div
                  className="card-dropdown"
                  onClick={() => toggleDropdown('why-now-04')}
                >
                  <span className="dropdown-text">Read More</span>
                  <span className={`dropdown-arrow ${expandedDropdown === 'why-now-04' ? 'expanded' : ''}`}>
                    {expandedDropdown === 'why-now-04' ? '▲' : '▼'}
                  </span>
                </div>
                {expandedDropdown === 'why-now-04' && (
                  <div className="dropdown-content">
                    <p className="dropdown-expanded-text">
                      The strategic plans you commit to between now and December will define your company's trajectory and your personal relevance for years to come.
                    </p>
                    <p className="dropdown-expanded-text">
                      You have a brief, rapidly closing window to make a fundamental choice. Will you enter 2026 armed with the same leadership model that worked in the past, hoping your experience alone will be enough to navigate this new terrain? Or will you enter the year having mastered the definitive skill of this era: the ability to synthesise machine intelligence and your own wisdom into demonstrable, defensible, and decisive leadership?
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Closing CTA */}
            <div className="why-now-cta mt-16">
              <p className="cta-text-white">The future isn't coming. It is here.</p>
              <p className="cta-text-gold mb-8">And it is asking what you are going to do about it.</p>
              <div className="flex justify-center">
                <button
                  className="why-now-cta-button"
                  onClick={handleOpenLogin}
                >
                  Build Your Advantage Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-black py-16 px-4 footer-section">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Brand Section */}
            <div className="footer-brand">
              <div className="flex items-center mb-4">
                <div className="footer-logo">
                  <span className="logo-icon">◊</span>
                  <span className="logo-text">AI-Augmented</span>
                </div>
              </div>
              <p className="footer-description">
                Amplifying human wisdom with AI intelligence to deliver unassailable strategic advantage for leaders who must be certain in a world of constant ambiguity.
              </p>
            </div>
            
            {/* Quick Links */}
            <div className="footer-links">
              <h3 className="footer-section-title">Quick Links</h3>
              <div className="footer-underline mb-4"></div>
              <ul className="footer-nav">
                <li><a href="/#how-it-works" className="footer-link">How It Works</a></li>
                <li><a href="/about" className="footer-link">Our Conviction</a></li>
                <li><a href="/ai-agent" className="footer-link">AI Agent</a></li>
                <li><button onClick={handleOpenSignup} className="footer-link bg-transparent border-none p-0 text-left cursor-pointer">Sign Up</button></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div className="footer-contact">
              <h3 className="footer-section-title">Contact</h3>
              <div className="footer-underline mb-4"></div>
              <div className="contact-info">
                <p className="contact-item">
                  <a href="mailto:celeste.farm@aureumai.ai" className="footer-link">
                    celeste.farm@aureumai.ai
                  </a>
                </p>
                <p className="contact-item">
                  <a href="tel:+447741964682" className="footer-link">
                    +44 774196 4682 (UK)
                  </a>
                </p>
                <p className="contact-item">
                  <a href="tel:+6580211633" className="footer-link">
                    +65 8021 1633 (SG)
                  </a>
                </p>
              </div>
            </div>
          </div>
          
          {/* Footer Bottom */}
          <div className="footer-bottom pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="footer-copyright">
                © 2025 AI-Augmented. All rights reserved.
              </p>
              <div className="footer-legal mt-4 md:mt-0">
                <a href="/privacy" className="footer-link mr-4">Privacy Policy</a>
                <span className="text-gray-600">|</span>
                <a href="/terms" className="footer-link ml-4">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
    </>
  );
};

export default LandingPage;