import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/landing.css';
import LandingPageHeader from '../components/LandingPageHeader';

const AIAgentPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <LandingPageHeader />
      
      {/* Hero Section - Meet Your AI Strategic Partner */}
      <section className="w-full bg-black py-32 px-4 hero-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center hero-content">
            <h1 className="hero-main-title mb-6">
              Meet Your AI<br />Strategic Partner
            </h1>
            <h2 className="hero-subtitle mb-8">
              Intelligence That Amplifies Your Wisdom
            </h2>
            <p className="hero-description mb-12">
              Our AI Agent doesn't replace your judgment—it sharpens it. Experience the power of artificial intelligence designed to enhance human decision-making, not override it.
            </p>
            <div className="flex justify-center">
              <button
                className="hero-cta-button"
                onClick={() => navigate('/auth')}
              >
                Start Your Strategic Partnership
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* The AI Advantage Section */}
      <section className="w-full bg-black py-32 px-4 loneliness-section">
        <div className="max-w-5xl mx-auto">
          <div className="text-center loneliness-content">
            <h2 className="loneliness-headline mb-8">
              The AI Advantage
            </h2>
            <div className="loneliness-body-text max-w-4xl mx-auto mb-12">
              <p className="mb-6">
                While other AI tools flood you with data, our AI Agent works differently. It engages in strategic dialogue, challenges your assumptions, and helps you build unshakeable conviction in your decisions.
              </p>
            </div>
            <div className="flex justify-center">
              <p className="loneliness-closing">
                This is AI designed for leaders who must be certain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How Our AI Agent Works Section */}
      <section className="w-full bg-black py-32 px-4 authority-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center authority-content">
            <h2 className="authority-title mb-8">
              How Our AI Agent<br />
              <span className="authority-title-accent">Transforms Your Decision-Making</span>
            </h2>
            <p className="authority-description max-w-4xl mx-auto mb-12">
              Our AI Agent is not a chatbot or search engine. It's a sophisticated strategic partner that engages with your specific challenges, questions your reasoning, and helps you build bulletproof strategies.
            </p>
            
            {/* AI Capabilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Capability 1 */}
              <div className="process-step">
                <div className="step-number">Strategic Dialogue</div>
                <h4 className="step-title">Intelligent Questioning</h4>
                <p className="step-description">
                  Our AI Agent doesn't just provide answers—it asks the right questions. It probes your assumptions, explores alternative perspectives, and ensures you've considered all angles before making critical decisions.
                </p>
              </div>
              
              {/* Capability 2 */}
              <div className="process-step">
                <div className="step-number">Risk Analysis</div>
                <h4 className="step-title">Comprehensive Risk Assessment</h4>
                <p className="step-description">
                  The AI systematically identifies potential risks, blind spots, and unintended consequences. It helps you prepare for scenarios you might not have considered, strengthening your strategic position.
                </p>
              </div>
              
              {/* Capability 3 */}
              <div className="process-step">
                <div className="step-number">Decision Architecture</div>
                <h4 className="step-title">Visual Strategy Mapping</h4>
                <p className="step-description">
                  Watch your reasoning take shape on our dynamic Exploration Map. The AI helps you visualize the logical architecture of your decision, making complex strategies clear and defensible.
                </p>
              </div>
              
              {/* Capability 4 */}
              <div className="process-step">
                <div className="step-number">Executive Synthesis</div>
                <h4 className="step-title">Last-Mile Brief Generation</h4>
                <p className="step-description">
                  The AI distills your strategic work into executive-ready documents. Clear rationale, identified risks, and actionable next steps—everything you need to present with confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Agent Capabilities Section */}
      <section className="w-full bg-black py-32 px-4 widening-chasm-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="chasm-main-title mb-4">
              AI Agent Capabilities
            </h2>
            <p className="chasm-subtitle">
              Advanced intelligence designed for strategic leadership
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Capability 1 */}
            <div className="chasm-column">
              <div className="chasm-accent-line bg-blue-500"></div>
              <h3 className="chasm-column-title">Contextual Understanding</h3>
              <h4 className="chasm-column-subtitle">Deep Industry Knowledge</h4>
              <p className="chasm-description">
                Our AI Agent understands your industry context, regulatory environment, and competitive landscape. It brings relevant expertise to every strategic conversation, ensuring recommendations are grounded in reality.
              </p>
            </div>
            
            {/* Capability 2 */}
            <div className="chasm-column">
              <div className="chasm-accent-line bg-green-500"></div>
              <h3 className="chasm-column-title">Adaptive Learning</h3>
              <h4 className="chasm-column-subtitle">Personalized Intelligence</h4>
              <p className="chasm-description">
                The AI learns your decision-making style, preferences, and strategic priorities. Over time, it becomes increasingly effective at providing insights that align with your leadership approach and organizational goals.
              </p>
            </div>
            
            {/* Capability 3 */}
            <div className="chasm-column">
              <div className="chasm-accent-line bg-purple-500"></div>
              <h3 className="chasm-column-title">Ethical Reasoning</h3>
              <h4 className="chasm-column-subtitle">Values-Aligned Decisions</h4>
              <p className="chasm-description">
                Beyond pure logic, our AI Agent considers ethical implications, stakeholder impacts, and long-term consequences. It helps you make decisions that are not just smart, but also responsible and sustainable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Real-World Applications Section */}
      <section className="w-full bg-black py-32 px-4 why-now-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center why-now-content">
            <h2 className="why-now-title mb-4">Real-World Applications</h2>
            <div className="why-now-underline mb-8"></div>
            <p className="why-now-subtitle mb-16">
              See how our AI Agent transforms critical business decisions
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Application 1 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="card-number">01</div>
                  <div className="card-period">Strategic Planning</div>
                </div>
                <h3 className="card-title">Market Entry Decisions</h3>
                <p className="card-description">
                  Navigate complex market entry strategies with AI-powered analysis of competitive dynamics, regulatory requirements, and resource allocation scenarios.
                </p>
              </div>
              
              {/* Application 2 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="card-number">02</div>
                  <div className="card-period">Crisis Management</div>
                </div>
                <h3 className="card-title">Crisis Response Planning</h3>
                <p className="card-description">
                  Develop robust crisis response strategies by exploring multiple scenarios, stakeholder impacts, and communication approaches with AI-guided analysis.
                </p>
              </div>
              
              {/* Application 3 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="card-number">03</div>
                  <div className="card-period">Investment Decisions</div>
                </div>
                <h3 className="card-title">M&A Strategy</h3>
                <p className="card-description">
                  Evaluate merger and acquisition opportunities with comprehensive due diligence support, integration planning, and risk assessment powered by AI insights.
                </p>
              </div>
              
              {/* Application 4 */}
              <div className="why-now-card">
                <div className="card-header">
                  <div className="card-number">04</div>
                  <div className="card-period">Organizational Change</div>
                </div>
                <h3 className="card-title">Digital Transformation</h3>
                <p className="card-description">
                  Lead digital transformation initiatives with AI-supported change management strategies, technology selection, and implementation roadmaps.
                </p>
              </div>
            </div>
            
            {/* CTA */}
            <div className="why-now-cta mt-16">
              <p className="cta-text-white">Ready to experience AI-augmented decision-making?</p>
              <p className="cta-text-gold mb-8">Your strategic advantage awaits.</p>
              <div className="flex justify-center">
                <button
                  className="why-now-cta-button"
                  onClick={() => navigate('/auth')}
                >
                  Start Working with Your AI Agent
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
                <li><a href="/ai-agent" className="footer-link">AI Agent</a></li>
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

export default AIAgentPage;