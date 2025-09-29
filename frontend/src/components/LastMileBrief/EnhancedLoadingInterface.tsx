import React, { useState, useEffect } from 'react';
import { Brain, Network, BarChart3, FileText, Sparkles, CheckCircle, Clock } from 'lucide-react';
import './EnhancedLoadingInterface.css';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: number; // in milliseconds
  status: 'pending' | 'active' | 'completed';
}

interface EnhancedLoadingInterfaceProps {
  nodeCount: number;
  edgeCount: number;
  onComplete?: () => void;
  isDataReady?: boolean; // New prop to indicate when actual data is available
}

const EnhancedLoadingInterface: React.FC<EnhancedLoadingInterfaceProps> = ({
  nodeCount,
  edgeCount,
  onComplete,
  isDataReady = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(Date.now());
  const [finalStepStartTime, setFinalStepStartTime] = useState<number | null>(null);
  const [animationCompleted, setAnimationCompleted] = useState(false);


  // Define the AI workflow steps with dynamic content based on data size
  const getWorkflowSteps = (): ProgressStep[] => {
    const baseSteps: ProgressStep[] = [
      {
        id: 'analyzing_structure',
        title: 'AI is analyzing the map structure',
        description: `Examining ${nodeCount} strategic elements and ${edgeCount} connections to understand the network topology`,
        icon: <Network className="w-6 h-6" />,
        duration: Math.max(800, nodeCount * 15), // Scales with data size
        status: 'pending'
      },
      {
        id: 'extracting_insights',
        title: 'AI is extracting insights from Human and AI nodes',
        description: `Processing node types, confidence levels, and strategic relationships across the network`,
        icon: <Brain className="w-6 h-6" />,
        duration: Math.max(1200, nodeCount * 20 + edgeCount * 10),
        status: 'pending'
      },
      {
        id: 'generating_analytics',
        title: 'AI is generating visual graphs and analytics',
        description: `Computing network metrics, confidence distributions, and strategic patterns`,
        icon: <BarChart3 className="w-6 h-6" />,
        duration: Math.max(1000, nodeCount * 12 + edgeCount * 8),
        status: 'pending'
      },
      {
        id: 'strategic_analysis',
        title: 'AI is performing strategic analysis',
        description: `Identifying key implications, opportunities, and risk factors for executive consideration`,
        icon: <Sparkles className="w-6 h-6" />,
        duration: Math.max(1500, nodeCount * 25),
        status: 'pending'
      },
      {
        id: 'compiling_brief',
        title: 'AI is compiling your Strategic Brief',
        description: `Synthesizing findings into executive summary, recommendations, and actionable insights`,
        icon: <FileText className="w-6 h-6" />,
        duration: Math.max(800, nodeCount * 10),
        status: 'pending'
      }
    ];

    // Mark first step as active
    if (baseSteps.length > 0) {
      baseSteps[0].status = 'active';
    }

    return baseSteps;
  };

  const [steps, setSteps] = useState<ProgressStep[]>(getWorkflowSteps());

  // Calculate total estimated duration
  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;

    const progressStep = () => {
      if (currentStepIndex >= steps.length) {
        // All animation steps completed - mark animation as done
        setProgress(100);
        setAnimationCompleted(true);
        return;
      }

      const currentStep = steps[currentStepIndex];
      const stepStartTime = Date.now();

      // Check if this is the final step (compiling brief) and set timer start
      if (currentStep.id === 'compiling_brief' && finalStepStartTime === null) {
        setFinalStepStartTime(stepStartTime);
      }

      // Update step to active
      setSteps(prevSteps =>
        prevSteps.map((step, index) => ({
          ...step,
          status: index === currentStepIndex ? 'active' :
                 index < currentStepIndex ? 'completed' : 'pending'
        }))
      );

      // Animate progress within the current step
      intervalId = setInterval(() => {
        const elapsed = Date.now() - stepStartTime;
        const stepProgress = Math.min(elapsed / currentStep.duration, 1);
        
        // Calculate overall progress
        const completedStepsProgress = currentStepIndex / steps.length;
        const currentStepProgress = stepProgress / steps.length;
        const overallProgress = (completedStepsProgress + currentStepProgress) * 100;
        
        setProgress(overallProgress);
      }, 50);

      // Move to next step after duration
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        
        // Mark current step as completed
        setSteps(prevSteps =>
          prevSteps.map((step, index) => ({
            ...step,
            status: index <= currentStepIndex ? 'completed' : 'pending'
          }))
        );

        // If this was the last step, mark animation as completed
        if (currentStepIndex === steps.length - 1) {
          setProgress(100);
          setAnimationCompleted(true);
        } else {
          setCurrentStepIndex(prev => prev + 1);
        }
      }, currentStep.duration);
    };

    progressStep();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [currentStepIndex, steps.length]);

  // Separate effect to handle completion when both animation and data are ready
  useEffect(() => {
    if (animationCompleted && isDataReady) {
      // Complete immediately without delay
      console.log('🎯 Both animation and data are ready - completing immediately');
      onComplete?.();
    }
  }, [animationCompleted, isDataReady, onComplete]);

  const getElapsedTime = () => {
    // Show elapsed time from the start of the process
    const elapsed = Date.now() - startTime;
    return `${Math.floor(elapsed / 1000)}s`;
  };

  const getEstimatedTimeRemaining = () => {
    // Calculate remaining time based on overall progress
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, totalDuration - elapsed);
    return `~${Math.ceil(remaining / 1000)}s`;
  };

  return (
    <div className="enhanced-loading-interface">
      <div className="loading-container">
        {/* Main Progress Circle */}
        <div className="progress-circle-container">
          <svg className="progress-circle" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(198, 172, 142, 0.2)"
              strokeWidth="4"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="#C6AC8E"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
              className="progress-stroke"
            />
          </svg>
          <div className="progress-content">
            <div className="progress-percentage">{Math.round(progress)}%</div>
            <div className="progress-label">Complete</div>
          </div>
        </div>

        {/* Main Title */}
        <h2 className="loading-title">Generating Strategic Brief</h2>
        <p className="loading-subtitle">
          AI is analyzing {nodeCount} strategic elements and {edgeCount} connections
        </p>

        {/* Progress Steps */}
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`progress-step ${step.status}`}
            >
              <div className="step-icon-container">
                <div className="step-icon">
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    step.icon
                  )}
                </div>
                {step.status === 'active' && (
                  <div className="step-pulse"></div>
                )}
              </div>
              
              <div className="step-content">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.description}</div>
              </div>

              <div className="step-status">
                {step.status === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                {step.status === 'active' && (
                  <div className="step-spinner"></div>
                )}
                {step.status === 'pending' && (
                  <Clock className="w-5 h-5 text-gray-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-stats">
            <span className="elapsed-time">Elapsed: {getElapsedTime()}</span>
            <span className="estimated-time">Remaining: {getEstimatedTimeRemaining()}</span>
          </div>
        </div>

        {/* Floating Particles Effect */}
        <div className="particles-container">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnhancedLoadingInterface;