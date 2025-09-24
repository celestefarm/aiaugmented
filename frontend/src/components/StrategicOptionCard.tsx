import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  BarChart3,
  Shield,
  Lightbulb,
  ArrowRight,
  Star,
  Clock,
  DollarSign,
  Users
} from 'lucide-react';

interface StrategicOption {
  id?: string;
  title: string;
  description: string;
  rationale?: string;
  confidence_score: number;
  feasibility_score?: number;
  impact_score?: number;
  risk_score?: number;
  risk_factors?: string[];
  opportunity_factors?: string[];
  success_criteria?: string[];
  supporting_evidence_ids?: string[];
  is_recommended?: boolean;
  is_validated?: boolean;
  estimated_timeline?: string;
  estimated_cost?: string;
  required_resources?: string[];
  key_stakeholders?: string[];
}

interface StrategicOptionCardProps {
  option: StrategicOption;
  isSelected?: boolean;
  isExpanded?: boolean;
  onSelect?: (option: StrategicOption) => void;
  onExpand?: (option: StrategicOption) => void;
  onValidate?: (option: StrategicOption) => void;
  onChallenge?: (option: StrategicOption) => void;
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}

const StrategicOptionCard: React.FC<StrategicOptionCardProps> = ({
  option,
  isSelected = false,
  isExpanded = false,
  onSelect,
  onExpand,
  onValidate,
  onChallenge,
  className = "",
  showActions = true,
  compact = false
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (score: number) => {
    if (score >= 0.8) return 'text-red-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(option);
    } else {
      setLocalExpanded(!localExpanded);
      onExpand?.(option);
    }
  };

  const expanded = onExpand ? isExpanded : localExpanded;

  return (
    <Card 
      className={`strategic-option-card transition-all duration-200 hover:shadow-lg ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300'
      } ${className}`}
    >
      <CardHeader 
        className={`cursor-pointer ${compact ? 'p-4' : 'p-6'}`}
        onClick={handleCardClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <CardTitle className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-gray-900`}>
                {option.title}
              </CardTitle>
              {option.is_recommended && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Star className="h-3 w-3 mr-1" />
                  Recommended
                </Badge>
              )}
              {option.is_validated && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Validated
                </Badge>
              )}
            </div>
            <p className={`text-gray-600 ${compact ? 'text-sm' : 'text-base'}`}>
              {option.description}
            </p>
          </div>
          
          {/* Confidence Score */}
          <div className={`ml-4 px-3 py-1 rounded-full ${getConfidenceColor(option.confidence_score)}`}>
            <div className="text-center">
              <div className="text-sm font-semibold">
                {Math.round(option.confidence_score * 100)}%
              </div>
              <div className="text-xs">Confidence</div>
            </div>
          </div>
        </div>

        {/* Score Metrics Row */}
        {!compact && (option.feasibility_score || option.impact_score || option.risk_score) && (
          <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-100">
            {option.feasibility_score !== undefined && (
              <div className="flex items-center space-x-1">
                <Target className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Feasibility:</span>
                <span className={`text-sm font-medium ${getScoreColor(option.feasibility_score)}`}>
                  {Math.round(option.feasibility_score * 100)}%
                </span>
              </div>
            )}
            {option.impact_score !== undefined && (
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Impact:</span>
                <span className={`text-sm font-medium ${getScoreColor(option.impact_score)}`}>
                  {Math.round(option.impact_score * 100)}%
                </span>
              </div>
            )}
            {option.risk_score !== undefined && (
              <div className="flex items-center space-x-1">
                <Shield className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Risk:</span>
                <span className={`text-sm font-medium ${getRiskColor(option.risk_score)}`}>
                  {Math.round(option.risk_score * 100)}%
                </span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      {/* Expanded Content */}
      {expanded && (
        <CardContent className={compact ? 'p-4 pt-0' : 'p-6 pt-0'}>
          {/* Rationale */}
          {option.rationale && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <Lightbulb className="h-4 w-4 mr-1 text-blue-600" />
                Strategic Rationale
              </h4>
              <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                {option.rationale}
              </p>
            </div>
          )}

          {/* Risk and Opportunity Factors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Risk Factors */}
            {option.risk_factors && option.risk_factors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Risk Factors
                </h4>
                <ul className="space-y-1">
                  {option.risk_factors.map((risk, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-red-500 mr-2 mt-1">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Opportunity Factors */}
            {option.opportunity_factors && option.opportunity_factors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Opportunities
                </h4>
                <ul className="space-y-1">
                  {option.opportunity_factors.map((opportunity, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-green-500 mr-2 mt-1">•</span>
                      <span>{opportunity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Success Criteria */}
          {option.success_criteria && option.success_criteria.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Success Criteria
              </h4>
              <ul className="space-y-1">
                {option.success_criteria.map((criteria, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="text-blue-500 mr-2 mt-1">•</span>
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Implementation Details */}
          {(option.estimated_timeline || option.estimated_cost || option.required_resources || option.key_stakeholders) && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <BarChart3 className="h-4 w-4 mr-1" />
                Implementation Details
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {option.estimated_timeline && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Timeline:</span>
                    <span className="text-sm font-medium text-gray-900">{option.estimated_timeline}</span>
                  </div>
                )}
                
                {option.estimated_cost && (
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Cost:</span>
                    <span className="text-sm font-medium text-gray-900">{option.estimated_cost}</span>
                  </div>
                )}
              </div>

              {option.required_resources && option.required_resources.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Required Resources:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {option.required_resources.map((resource, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {resource}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {option.key_stakeholders && option.key_stakeholders.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Key Stakeholders:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {option.key_stakeholders.map((stakeholder, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {stakeholder}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supporting Evidence */}
          {option.supporting_evidence_ids && option.supporting_evidence_ids.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Shield className="h-4 w-4 mr-1" />
                Supporting Evidence ({option.supporting_evidence_ids.length} items)
              </h4>
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                This option is backed by {option.supporting_evidence_ids.length} pieces of evidence.
                <Button variant="ghost" size="sm" className="ml-2 p-0 h-auto text-blue-600">
                  View Evidence
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {showActions && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
              <Button 
                variant="default" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(option);
                }}
                className="flex items-center space-x-1"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Select Option</span>
              </Button>
              
              {!option.is_validated && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onValidate?.(option);
                  }}
                  className="flex items-center space-x-1"
                >
                  <Shield className="h-4 w-4" />
                  <span>Validate</span>
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onChallenge?.(option);
                }}
                className="flex items-center space-x-1"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Challenge</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                className="flex items-center space-x-1"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Analyze</span>
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default StrategicOptionCard;