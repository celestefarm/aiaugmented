import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Shield, 
  Target,
  MessageCircle,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  Zap,
  TrendingUp,
  Users,
  Eye,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

interface RedTeamChallenge {
  id: string;
  challenge_type: 'assumption_challenge' | 'evidence_scrutiny' | 'alternative_perspective' | 'risk_amplification' | 'resource_constraint' | 'stakeholder_opposition';
  question: string;
  target: string;
  difficulty: 'gentle' | 'moderate' | 'aggressive' | 'devil_advocate';
  expected_elements: string[];
  follow_up_questions: string[];
  created_at: string;
}

interface ChallengeResponse {
  challenge_id: string;
  user_response: string;
  evaluation: {
    response_quality: number;
    addresses_challenge: boolean;
    provides_evidence: boolean;
    acknowledges_limitations: boolean;
    suggests_mitigations: boolean;
    strengthens_position: boolean;
    areas_for_improvement: string[];
    follow_up_needed: boolean;
  };
  follow_up_question?: string;
  challenge_resolved: boolean;
  strategic_strength_assessment: string;
}

interface RedTeamInterfaceProps {
  sessionId: string;
  currentChallenge?: RedTeamChallenge;
  challengeHistory?: ChallengeResponse[];
  onGenerateChallenge?: (type?: string, difficulty?: string) => void;
  onSubmitResponse?: (challengeId: string, response: string) => void;
  onRequestFollowUp?: (challengeId: string) => void;
  className?: string;
  isActive?: boolean;
}

const RedTeamInterface: React.FC<RedTeamInterfaceProps> = ({
  sessionId,
  currentChallenge,
  challengeHistory = [],
  onGenerateChallenge,
  onSubmitResponse,
  onRequestFollowUp,
  className = "",
  isActive = false
}) => {
  const [userResponse, setUserResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChallengeType, setSelectedChallengeType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('moderate');
  const [showHistory, setShowHistory] = useState(false);

  const challengeTypes = {
    assumption_challenge: {
      label: 'Assumption Challenge',
      icon: <Target className="h-4 w-4" />,
      description: 'Challenge underlying assumptions',
      color: 'bg-blue-100 text-blue-800'
    },
    evidence_scrutiny: {
      label: 'Evidence Scrutiny',
      icon: <Eye className="h-4 w-4" />,
      description: 'Question evidence quality and sources',
      color: 'bg-purple-100 text-purple-800'
    },
    alternative_perspective: {
      label: 'Alternative Perspective',
      icon: <Users className="h-4 w-4" />,
      description: 'Explore different viewpoints',
      color: 'bg-green-100 text-green-800'
    },
    risk_amplification: {
      label: 'Risk Amplification',
      icon: <AlertTriangle className="h-4 w-4" />,
      description: 'Amplify and explore risks',
      color: 'bg-red-100 text-red-800'
    },
    resource_constraint: {
      label: 'Resource Constraint',
      icon: <Shield className="h-4 w-4" />,
      description: 'Challenge resource assumptions',
      color: 'bg-yellow-100 text-yellow-800'
    },
    stakeholder_opposition: {
      label: 'Stakeholder Opposition',
      icon: <Users className="h-4 w-4" />,
      description: 'Consider stakeholder resistance',
      color: 'bg-orange-100 text-orange-800'
    }
  };

  const difficultyLevels = {
    gentle: { label: 'Gentle', color: 'bg-green-100 text-green-800' },
    moderate: { label: 'Moderate', color: 'bg-yellow-100 text-yellow-800' },
    aggressive: { label: 'Aggressive', color: 'bg-orange-100 text-orange-800' },
    devil_advocate: { label: "Devil's Advocate", color: 'bg-red-100 text-red-800' }
  };

  const handleSubmitResponse = async () => {
    if (!currentChallenge || !userResponse.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmitResponse?.(currentChallenge.id, userResponse);
      setUserResponse('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateChallenge = () => {
    onGenerateChallenge?.(selectedChallengeType, selectedDifficulty);
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-green-600';
    if (quality >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStrengthColor = (assessment: string) => {
    switch (assessment) {
      case 'highly_robust': return 'bg-green-100 text-green-800';
      case 'moderately_robust': return 'bg-yellow-100 text-yellow-800';
      case 'needs_strengthening': return 'bg-orange-100 text-orange-800';
      case 'requires_significant_work': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatChallengeType = (type: string) => {
    return challengeTypes[type as keyof typeof challengeTypes]?.label || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={`red-team-interface space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Red Team Challenge</h2>
            <p className="text-sm text-gray-500">
              Stress-test your strategic thinking through Socratic dialogue
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {isActive ? 'Active Session' : 'Inactive'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <Clock className="h-4 w-4 mr-1" />
            History ({challengeHistory.length})
          </Button>
        </div>
      </div>

      {/* Challenge Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Generate Challenge</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Challenge Type Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Challenge Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(challengeTypes).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedChallengeType(type)}
                    className={`p-3 border rounded-lg text-left transition-all hover:shadow-md ${
                      selectedChallengeType === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      {config.icon}
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    <p className="text-xs text-gray-600">{config.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Difficulty Level
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(difficultyLevels).map(([level, config]) => (
                  <button
                    key={level}
                    onClick={() => setSelectedDifficulty(level)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedDifficulty === level
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateChallenge}
              disabled={!selectedChallengeType}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              Generate Challenge
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Challenge */}
      {currentChallenge && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>Active Challenge</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge className={challengeTypes[currentChallenge.challenge_type]?.color}>
                  {formatChallengeType(currentChallenge.challenge_type)}
                </Badge>
                <Badge className={difficultyLevels[currentChallenge.difficulty]?.color}>
                  {difficultyLevels[currentChallenge.difficulty]?.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Challenge Question */}
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h4 className="font-medium text-gray-900 mb-2">Challenge:</h4>
                <p className="text-gray-700">{currentChallenge.question}</p>
                {currentChallenge.target && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-600">Target: </span>
                    <span className="text-sm font-medium text-gray-900">{currentChallenge.target}</span>
                  </div>
                )}
              </div>

              {/* Expected Elements */}
              {currentChallenge.expected_elements.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Consider addressing these elements:
                  </h4>
                  <ul className="space-y-1">
                    {currentChallenge.expected_elements.map((element, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{element}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Response Input */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Your Response:
                </label>
                <textarea
                  value={userResponse}
                  onChange={(e) => setUserResponse(e.target.value)}
                  placeholder="Provide a thoughtful response to the challenge..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmitResponse}
                disabled={!userResponse.trim() || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Response
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest Response Evaluation */}
      {challengeHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Latest Evaluation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const latest = challengeHistory[challengeHistory.length - 1];
              return (
                <div className="space-y-4">
                  {/* Response Quality Score */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">Response Quality:</span>
                    <span className={`text-lg font-bold ${getQualityColor(latest.evaluation.response_quality)}`}>
                      {Math.round(latest.evaluation.response_quality * 100)}%
                    </span>
                  </div>

                  {/* Evaluation Criteria */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Addresses Challenge:</span>
                        {latest.evaluation.addresses_challenge ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Provides Evidence:</span>
                        {latest.evaluation.provides_evidence ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Acknowledges Limitations:</span>
                        {latest.evaluation.acknowledges_limitations ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Suggests Mitigations:</span>
                        {latest.evaluation.suggests_mitigations ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Strengthens Position:</span>
                        {latest.evaluation.strengthens_position ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Challenge Resolved:</span>
                        {latest.challenge_resolved ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Areas for Improvement */}
                  {latest.evaluation.areas_for_improvement.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Areas for Improvement:</h4>
                      <ul className="space-y-1">
                        {latest.evaluation.areas_for_improvement.map((area, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                            <span className="text-orange-500 mt-1">•</span>
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Follow-up Question */}
                  {latest.follow_up_question && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">Follow-up Question:</h4>
                      <p className="text-sm text-blue-700">{latest.follow_up_question}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => onRequestFollowUp?.(latest.challenge_id)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Respond to Follow-up
                      </Button>
                    </div>
                  )}

                  {/* Strategic Strength Assessment */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Strategic Robustness:</span>
                      <Badge className={getStrengthColor(latest.strategic_strength_assessment)}>
                        {latest.strategic_strength_assessment.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Challenge History */}
      {showHistory && challengeHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Challenge History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {challengeHistory.map((response, index) => (
                <div key={response.challenge_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      Challenge #{index + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${getQualityColor(response.evaluation.response_quality)}`}>
                        {Math.round(response.evaluation.response_quality * 100)}%
                      </span>
                      {response.challenge_resolved ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{response.user_response}</p>
                  {response.evaluation.areas_for_improvement.length > 0 && (
                    <div className="mt-2 text-xs text-orange-600">
                      Improvement areas: {response.evaluation.areas_for_improvement.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Challenge State */}
      {!currentChallenge && challengeHistory.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Challenges</h3>
            <p className="text-gray-600 mb-4">
              Generate a red team challenge to stress-test your strategic thinking.
            </p>
            <Button onClick={() => setSelectedChallengeType('assumption_challenge')}>
              <Zap className="h-4 w-4 mr-2" />
              Start Red Team Session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RedTeamInterface;