import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';

interface StrategicOption {
  title: string;
  description: string;
  confidence_score: number;
  risk_factors?: string[];
  opportunity_factors?: string[];
  success_criteria?: string[];
}

interface LightningBrief {
  situation_summary: string;
  key_insights: string[];
  strategic_options: StrategicOption[];
  critical_assumptions: string[];
  next_actions: string[];
  confidence_level: string;
  generated_at: string;
}

interface LightningBriefDisplayProps {
  lightningBrief: LightningBrief;
  onOptionSelect?: (option: StrategicOption) => void;
  onActionSelect?: (action: string) => void;
  className?: string;
}

const LightningBriefDisplay: React.FC<LightningBriefDisplayProps> = ({
  lightningBrief,
  onOptionSelect,
  onActionSelect,
  className = ""
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [selectedOption, setSelectedOption] = useState<StrategicOption | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getConfidenceBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleOptionClick = (option: StrategicOption) => {
    setSelectedOption(option);
    onOptionSelect?.(option);
  };

  const handleActionClick = (action: string) => {
    onActionSelect?.(action);
  };

  const CollapsibleSection: React.FC<{
    id: string;
    title: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
    children: React.ReactNode;
  }> = ({ id, title, icon, badge, children }) => {
    const isExpanded = expandedSections.has(id);
    
    return (
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection(id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {icon}
              <CardTitle className="text-lg">{title}</CardTitle>
              {badge}
            </div>
            {isExpanded ? 
              <ChevronUp className="h-4 w-4" /> : 
              <ChevronDown className="h-4 w-4" />
            }
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            {children}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className={`lightning-brief-display space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Lightning Brief</h2>
            <p className="text-sm text-gray-500">Generated {formatDate(lightningBrief.generated_at)}</p>
          </div>
        </div>
        <Badge className={getConfidenceBadgeColor(lightningBrief.confidence_level)}>
          {lightningBrief.confidence_level.toUpperCase()} CONFIDENCE
        </Badge>
      </div>

      {/* Situation Summary */}
      <CollapsibleSection
        id="summary"
        title="Situation Summary"
        icon={<Target className="h-5 w-5 text-blue-600" />}
      >
        <p className="text-gray-700 leading-relaxed">{lightningBrief.situation_summary}</p>
      </CollapsibleSection>

      {/* Key Insights */}
      <CollapsibleSection
        id="insights"
        title="Key Insights"
        icon={<Lightbulb className="h-5 w-5 text-yellow-600" />}
        badge={<Badge variant="secondary">{lightningBrief.key_insights.length}</Badge>}
      >
        <ul className="space-y-3">
          {lightningBrief.key_insights.map((insight, index) => (
            <li key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-medium text-yellow-700">{index + 1}</span>
              </div>
              <p className="text-gray-700">{insight}</p>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Strategic Options */}
      <CollapsibleSection
        id="options"
        title="Strategic Options"
        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
        badge={<Badge variant="secondary">{lightningBrief.strategic_options.length}</Badge>}
      >
        <div className="space-y-4">
          {lightningBrief.strategic_options.map((option, index) => (
            <div 
              key={index} 
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedOption === option 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleOptionClick(option)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{option.title}</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Confidence:</span>
                  <span className={`font-medium ${getConfidenceScoreColor(option.confidence_score)}`}>
                    {Math.round(option.confidence_score * 100)}%
                  </span>
                </div>
              </div>
              <p className="text-gray-600 mb-3">{option.description}</p>
              
              {/* Risk and Opportunity Factors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {option.risk_factors && option.risk_factors.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Risk Factors
                    </h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {option.risk_factors.map((risk, riskIndex) => (
                        <li key={riskIndex} className="flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {option.opportunity_factors && option.opportunity_factors.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Opportunities
                    </h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {option.opportunity_factors.map((opportunity, oppIndex) => (
                        <li key={oppIndex} className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {opportunity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Success Criteria */}
              {option.success_criteria && option.success_criteria.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <h5 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Success Criteria
                  </h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {option.success_criteria.map((criteria, criteriaIndex) => (
                      <li key={criteriaIndex} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        {criteria}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Critical Assumptions */}
      <CollapsibleSection
        id="assumptions"
        title="Critical Assumptions"
        icon={<Shield className="h-5 w-5 text-orange-600" />}
        badge={<Badge variant="secondary">{lightningBrief.critical_assumptions.length}</Badge>}
      >
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-orange-800">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            These assumptions underpin your strategic options. Consider validating them before proceeding.
          </p>
        </div>
        <ul className="space-y-3">
          {lightningBrief.critical_assumptions.map((assumption, index) => (
            <li key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-medium text-orange-700">{index + 1}</span>
              </div>
              <p className="text-gray-700">{assumption}</p>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Next Actions */}
      <CollapsibleSection
        id="actions"
        title="Next Actions"
        icon={<Clock className="h-5 w-5 text-purple-600" />}
        badge={<Badge variant="secondary">{lightningBrief.next_actions.length}</Badge>}
      >
        <div className="space-y-3">
          {lightningBrief.next_actions.map((action, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-medium text-purple-700">{index + 1}</span>
                </div>
                <p className="text-gray-700">{action}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleActionClick(action)}
                className="ml-4"
              >
                Take Action
              </Button>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
        <Button variant="default" className="flex items-center space-x-2">
          <CheckCircle className="h-4 w-4" />
          <span>Approve Brief</span>
        </Button>
        <Button variant="outline" className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Challenge Assumptions</span>
        </Button>
        <Button variant="outline" className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4" />
          <span>Explore Options</span>
        </Button>
        <Button variant="ghost" className="flex items-center space-x-2">
          <Clock className="h-4 w-4" />
          <span>Schedule Review</span>
        </Button>
      </div>
    </div>
  );
};

export default LightningBriefDisplay;