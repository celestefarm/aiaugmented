import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';
import LandingPageHeader from '../components/LandingPageHeader';

const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <LandingPageHeader />
      
      {/* Hero Section - About AI-Augmented */}
      <section className="w-full bg-black py-32 px-4 hero-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center hero-content">
            <h1 className="hero-main-title mb-6">
              About <button onClick={() => navigate('/')} className="hover:text-gray-300 transition-colors duration-200 cursor-pointer">AI-Augmented</button>
            </h1>
            <p className="hero-description mb-12">
              We amplify human wisdom with AI intelligence to deliver unassailable strategic advantage for leaders who must be certain in a world of constant ambiguity.
            </p>
          </div>
        </div>
      </section>

      {/* Our Conviction Section */}
      <section className="w-full bg-black py-32 px-4 loneliness-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center loneliness-content">
            <h2 className="loneliness-headline mb-8">
              Our Conviction
            </h2>
            <div className="loneliness-body-text max-w-4xl mx-auto mb-12">
              <p className="mb-6">
                In an age of automation, AI is a commodity. True competitive advantage no longer comes from processing power, but from the irreplaceable quality of human insight, ethical judgment, and decisive leadership.
              </p>
            </div>
            <div className="flex justify-center">
              <p className="loneliness-closing">
                Your future relevance depends on mastering this synthesis.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* An Obsession Born from a Crisis of Thought Section */}
      <section className="w-full bg-black py-32 px-4 authority-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center authority-content">
            <h2 className="authority-title mb-8">
              An Obsession Born from a<br />
              <span className="authority-title-accent">Crisis of Thought</span>
            </h2>
            
            <div className="authority-description max-w-4xl mx-auto mb-12 text-left">
              <p className="mb-6">
                This platform wasn't born in a boardroom, but from my own experience on the front lines of complex analysis. I was tasked with a critical project, armed with the best AI tools available. I had infinite data and instant answers, yet I found myself strategically paralyzed.
              </p>
              
              <p className="mb-6">
                But a deeper, more disturbing realization began to set in. I started to question the origin of my own thoughts. Was that my idea, or was I just repeating the machine? Was I still thinking critically, or was I just becoming a sophisticated operator for an algorithm?
              </p>
              
              <p className="mb-6">
                I felt the core of my reasoning, my ability to analyze, synthesize, and form an independent judgment, being silently outsourced. It was a slow corrosion of my most essential professional skill. I reached a terrifying point where I felt I couldn't function without the AI, not because it made me better, but because my own critical thinking had become dependent on it.
              </p>
              
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 my-8">
                <p className="text-center text-lg font-medium text-white">
                  That was my catalyst. I realised the greatest threat wasn't being replaced by AI, but the atrophy of our own minds.
                </p>
              </div>
              
              <p className="mb-6">
                The challenge wasn't just about making better decisions; it was about preserving the integrity of human thought itself. I became obsessed with building a system to reverse this corrosion, anchored by the foundational belief that AI's true purpose is to augment human intelligence, not replace it. This framework uses AI as a sparring partner to make our own minds stronger, fusing its core intelligence with deep human competence to create an entirely new class of strategic insight.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Core Values Section */}
      <section className="w-full bg-black py-32 px-4 why-now-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center why-now-content">
            <h2 className="why-now-title mb-4">Our Core Values</h2>
            <div className="why-now-underline mb-8"></div>
            <p className="why-now-subtitle mb-16">
              The principles that guide everything we do
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Value 1 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="why-now-underline mb-4"></div>
                </div>
                <h3 className="card-title">Human-Centric AI</h3>
                <p className="card-description">
                  AI should amplify human intelligence, not replace it. We design systems that enhance your decision-making capabilities while preserving your unique insights and judgment.
                </p>
              </div>
              
              {/* Value 2 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="why-now-underline mb-4"></div>
                </div>
                <h3 className="card-title">Uncompromising Quality</h3>
                <p className="card-description">
                  Every decision you make shapes your legacy. We provide tools and insights of the highest caliber, ensuring your strategic choices are built on solid foundations.
                </p>
              </div>
              
              {/* Value 3 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="why-now-underline mb-4"></div>
                </div>
                <h3 className="card-title">Decisive Action</h3>
                <p className="card-description">
                  Analysis paralysis is the enemy of leadership. We help you move from uncertainty to conviction, enabling swift, confident decision-making when it matters most.
                </p>
              </div>
              
              {/* Value 4 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="why-now-underline mb-4"></div>
                </div>
                <h3 className="card-title">Collaborative Intelligence</h3>
                <p className="card-description">
                  The best decisions emerge from the intersection of human wisdom and artificial intelligence. We facilitate this collaboration to unlock unprecedented strategic insights.
                </p>
              </div>
              
              {/* Value 5 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="why-now-underline mb-4"></div>
                </div>
                <h3 className="card-title">Global Impact</h3>
                <p className="card-description">
                  Great leaders shape the world. We're committed to empowering decision-makers who will create positive, lasting change across industries and communities.
                </p>
              </div>
              
              {/* Value 6 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="why-now-underline mb-4"></div>
                </div>
                <h3 className="card-title">Precision & Clarity</h3>
                <p className="card-description">
                  In a world of information overload, clarity is power. We cut through the noise to deliver precise, actionable insights that drive meaningful results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem We Solve Section */}
      <section className="w-full bg-black py-32 px-4 widening-chasm-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="chasm-main-title mb-4">
              The Problem We Solve
            </h2>
            <p className="chasm-subtitle">
              Senior leaders today face an unprecedented challenge: the very AI tools meant to help them are creating a crisis of confidence in their own judgment.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* The Challenge Column */}
            <div className="chasm-column">
              <div className="chasm-accent-line"></div>
              <h3 className="chasm-column-title">The Challenge</h3>
              <div className="space-y-4 mt-6">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="chasm-description">Information overload masquerading as insight</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="chasm-description">Erosion of confidence in human judgment</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="chasm-description">Analysis paralysis in critical moments</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="chasm-description">Fear of being replaced by AI systems</p>
                </div>
              </div>
            </div>
            
            {/* Our Solution Column */}
            <div className="chasm-column">
              <div className="chasm-accent-line bg-green-500"></div>
              <h3 className="chasm-column-title">Our Solution</h3>
              <div className="space-y-4 mt-6">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="chasm-description">AI that amplifies rather than replaces human wisdom</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="chasm-description">Structured decision-making frameworks</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="chasm-description">Confidence-building through rigorous analysis</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="chasm-description">Clear, actionable strategic insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Amplify Your Leadership Section */}
      <section className="w-full bg-black py-32 px-4 hero-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center hero-content">
            <h1 className="hero-main-title mb-6">
              Ready to Amplify Your <span className="text-[#D4AF37]">Leadership</span>?
            </h1>
            <p className="hero-description mb-12">
              Join the leaders who are already using <button onClick={() => navigate('/')} className="hover:text-gray-300 transition-colors duration-200 cursor-pointer underline">AI-Augmented</button> to make better decisions, faster, with unshakeable confidence.
            </p>
            <div className="flex justify-center">
              <button
                className="hero-cta-button"
                onClick={() => navigate('/auth')}
              >
                Get Started Today
              </button>
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
                  <button onClick={() => navigate('/')} className="logo-text hover:text-gray-300 transition-colors duration-200 cursor-pointer">AI-Augmented</button>
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
                <li><a href="/" className="footer-link">Home</a></li>
                <li><a href="/about" className="footer-link">About</a></li>
                <li><a href="/auth" className="footer-link">Sign Up</a></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div className="footer-contact">
              <h3 className="footer-section-title">Contact</h3>
              <div className="footer-underline mb-4"></div>
              <div className="contact-info">
                <p className="contact-item">
                  <a href="mailto:celeste.farm@ausurmai.ai" className="footer-link">
                    celeste.farm@ausurmai.ai
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
                © 2025 <button onClick={() => navigate('/')} className="hover:text-gray-300 transition-colors duration-200 cursor-pointer underline">AI-Augmented</button>. All rights reserved.
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

export default AboutPage;