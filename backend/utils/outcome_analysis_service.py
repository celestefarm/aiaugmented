
"""
Outcome Analysis Service
Analyzes strategic decisions, tracks outcomes, and provides insights
for continuous improvement in strategic decision-making
"""

import asyncio
import logging
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
from enum import Enum
from dataclasses import dataclass, asdict
import numpy as np
from collections import defaultdict, Counter

from backend.database_memory import get_database
from backend.utils.performance_monitor import perf_monitor
from bson import ObjectId

logger = logging.getLogger(__name__)


class OutcomeStatus(Enum):
    """Status of outcome tracking"""
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    ACHIEVED = "achieved"
    PARTIALLY_ACHIEVED = "partially_achieved"
    NOT_ACHIEVED = "not_achieved"
    CANCELLED = "cancelled"
    DELAYED = "delayed"


class OutcomeType(Enum):
    """Types of outcomes to track"""
    FINANCIAL = "financial"
    OPERATIONAL = "operational"
    STRATEGIC = "strategic"
    CUSTOMER = "customer"
    EMPLOYEE = "employee"
    MARKET = "market"
    RISK = "risk"
    INNOVATION = "innovation"
    COMPLIANCE = "compliance"


class AnalysisMethod(Enum):
    """Methods for outcome analysis"""
    QUANTITATIVE = "quantitative"
    QUALITATIVE = "qualitative"
    MIXED_METHOD = "mixed_method"
    COMPARATIVE = "comparative"
    TREND_ANALYSIS = "trend_analysis"
    CORRELATION = "correlation"
    REGRESSION = "regression"


@dataclass
class OutcomeMetric:
    """Individual outcome metric"""
    id: str
    name: str
    description: str
    outcome_type: OutcomeType
    target_value: Union[float, str]
    actual_value: Optional[Union[float, str]] = None
    unit: Optional[str] = None
    measurement_method: str = "manual"
    baseline_value: Optional[Union[float, str]] = None
    threshold_values: Dict[str, Union[float, str]] = None
    is_quantitative: bool = True
    weight: float = 1.0
    created_at: datetime = None
    updated_at: datetime = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()
        if self.threshold_values is None:
            self.threshold_values = {}


@dataclass
class OutcomeRecord:
    """Record of a strategic outcome"""
    id: str
    user_id: str
    session_id: Optional[str]
    decision_id: Optional[str]
    title: str
    description: str
    outcome_type: OutcomeType
    status: OutcomeStatus
    metrics: List[OutcomeMetric]
    expected_completion_date: Optional[datetime] = None
    actual_completion_date: Optional[datetime] = None
    success_criteria: List[str] = None
    risk_factors: List[str] = None
    dependencies: List[str] = None
    stakeholders: List[str] = None
    lessons_learned: List[str] = None
    confidence_score: float = 0.5
    impact_score: float = 0.0
    effort_score: float = 0.0
    created_at: datetime = None
    updated_at: datetime = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()
        if self.success_criteria is None:
            self.success_criteria = []
        if self.risk_factors is None:
            self.risk_factors = []
        if self.dependencies is None:
            self.dependencies = []
        if self.stakeholders is None:
            self.stakeholders = []
        if self.lessons_learned is None:
            self.lessons_learned = []
        if self.metadata is None:
            self.metadata = {}


@dataclass
class AnalysisResult:
    """Result of outcome analysis"""
    analysis_id: str
    user_id: str
    analysis_type: str
    method: AnalysisMethod
    outcomes_analyzed: List[str]
    key_findings: List[str]
    recommendations: List[str]
    success_rate: float
    average_impact: float
    trend_analysis: Dict[str, Any]
    correlation_analysis: Dict[str, Any]
    risk_analysis: Dict[str, Any]
    performance_metrics: Dict[str, float]
    confidence_level: float
    analysis_date: datetime = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.analysis_date is None:
            self.analysis_date = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}


class OutcomeAnalysisService:
    """Comprehensive outcome analysis and tracking service"""
    
    def __init__(self):
        self.outcome_cache: Dict[str, OutcomeRecord] = {}
        self.analysis_cache: Dict[str, AnalysisResult] = {}
        
        # Analysis thresholds
        self.success_thresholds = {
            "high": 0.8,
            "medium": 0.6,
            "low": 0.4
        }
        
        # Impact scoring weights
        self.impact_weights = {
            OutcomeType.FINANCIAL: 1.2,
            OutcomeType.STRATEGIC: 1.1,
            OutcomeType.OPERATIONAL: 1.0,
            OutcomeType.CUSTOMER: 1.0,
            OutcomeType.MARKET: 0.9,
            OutcomeType.EMPLOYEE: 0.8,
            OutcomeType.RISK: 1.1,
            OutcomeType.INNOVATION: 0.9,
            OutcomeType.COMPLIANCE: 0.7
        }

    async def create_outcome_record(self,
                                  user_id: str,
                                  title: str,
                                  description: str,
                                  outcome_type: OutcomeType,
                                  metrics: List[Dict[str, Any]],
                                  session_id: Optional[str] = None,
                                  decision_id: Optional[str] = None,
                                  expected_completion_date: Optional[datetime] = None,
                                  success_criteria: List[str] = None,
                                  **kwargs) -> str:
        """Create a new outcome record"""
        try:
            outcome_id = f"outcome_{user_id}_{int(datetime.utcnow().timestamp())}"
            
            # Create outcome metrics
            outcome_metrics = []
            for i, metric_data in enumerate(metrics):
                metric_id = f"{outcome_id}_metric_{i}"
                metric = OutcomeMetric(
                    id=metric_id,
                    name=metric_data["name"],
                    description=metric_data.get("description", ""),
                    outcome_type=outcome_type,
                    target_value=metric_data["target_value"],
                    unit=metric_data.get("unit"),
                    measurement_method=metric_data.get("measurement_method", "manual"),
                    baseline_value=metric_data.get("baseline_value"),
                    threshold_values=metric_data.get("threshold_values", {}),
                    is_quantitative=metric_data.get("is_quantitative", True),
                    weight=metric_data.get("weight", 1.0)
                )
                outcome_metrics.append(metric)
            
            # Create outcome record
            outcome_record = OutcomeRecord(
                id=outcome_id,
                user_id=user_id,
                session_id=session_id,
                decision_id=decision_id,
                title=title,
                description=description,
                outcome_type=outcome_type,
                status=OutcomeStatus.PLANNED,
                metrics=outcome_metrics,
                expected_completion_date=expected_completion_date,
                success_criteria=success_criteria or [],
                **kwargs
            )
            
            # Store in cache and database
            self.outcome_cache[outcome_id] = outcome_record
            await self._store_outcome_record(outcome_record)
            
            logger.info(f"Created outcome record: {outcome_id}")
            return outcome_id
            
        except Exception as e:
            logger.error(f"Error creating outcome record: {str(e)}")
            raise

    async def update_outcome_progress(self,
                                    outcome_id: str,
                                    user_id: str,
                                    metric_updates: Dict[str, Any],
                                    status: Optional[OutcomeStatus] = None,
                                    lessons_learned: List[str] = None,
                                    actual_completion_date: Optional[datetime] = None) -> bool:
        """Update outcome progress and metrics"""
        try:
            # Get outcome record
            outcome_record = await self._get_outcome_record(outcome_id, user_id)
            if not outcome_record:
                raise ValueError(f"Outcome record {outcome_id} not found")
            
            # Update metrics
            for metric in outcome_record.metrics:
                if metric.id in metric_updates:
                    metric.actual_value = metric_updates[metric.id]
                    metric.updated_at = datetime.utcnow()
            
            # Update status if provided
            if status:
                outcome_record.status = status
            
            # Update completion date
            if actual_completion_date:
                outcome_record.actual_completion_date = actual_completion_date
            
            # Add lessons learned
            if lessons_learned:
                outcome_record.lessons_learned.extend(lessons_learned)
            
            # Update timestamp
            outcome_record.updated_at = datetime.utcnow()
            
            # Recalculate scores
            outcome_record.impact_score = self._calculate_impact_score(outcome_record)
            outcome_record.confidence_score = self._calculate_confidence_score(outcome_record)
            
            # Update cache and database
            self.outcome_cache[outcome_id] = outcome_record
            await self._update_outcome_record(outcome_record)
            
            logger.info(f"Updated outcome progress: {outcome_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating outcome progress: {str(e)}")
            return False

    async def analyze_outcomes(self,
                             user_id: str,
                             analysis_type: str = "comprehensive",
                             method: AnalysisMethod = AnalysisMethod.MIXED_METHOD,
                             session_id: Optional[str] = None,
                             outcome_ids: List[str] = None,
                             time_range: Optional[Tuple[datetime, datetime]] = None) -> AnalysisResult:
        """Perform comprehensive outcome analysis"""
        timer = perf_monitor.start_timer(f"outcome_analysis_{analysis_type}")
        
        try:
            # Get outcomes to analyze
            outcomes = await self._get_outcomes_for_analysis(
                user_id, session_id, outcome_ids, time_range
            )
            
            if not outcomes:
                raise ValueError("No outcomes found for analysis")
            
            analysis_id = f"analysis_{user_id}_{int(datetime.utcnow().timestamp())}"
            
            # Perform different types of analysis
            key_findings = []
            recommendations = []
            
            # Success rate analysis
            success_rate = self._calculate_success_rate(outcomes)
            key_findings.append(f"Overall success rate: {success_rate:.1%}")
            
            # Impact analysis
            average_impact = self._calculate_average_impact(outcomes)
            key_findings.append(f"Average impact score: {average_impact:.2f}")
            
            # Trend analysis
            trend_analysis = self._perform_trend_analysis(outcomes)
            if trend_analysis.get("trend_direction"):
                key_findings.append(f"Trend direction: {trend_analysis['trend_direction']}")
            
            # Correlation analysis
            correlation_analysis = self._perform_correlation_analysis(outcomes)
            
            # Risk analysis
            risk_analysis = self._perform_risk_analysis(outcomes)
            
            # Performance metrics
            performance_metrics = self._calculate_performance_metrics(outcomes)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                outcomes, success_rate, average_impact, trend_analysis, risk_analysis
            )
            
            # Calculate confidence level
            confidence_level = self._calculate_analysis_confidence(outcomes, method)
            
            # Create analysis result
            analysis_result = AnalysisResult(
                analysis_id=analysis_id,
                user_id=user_id,
                analysis_type=analysis_type,
                method=method,
                outcomes_analyzed=[o.id for o in outcomes],
                key_findings=key_findings,
                recommendations=recommendations,
                success_rate=success_rate,
                average_impact=average_impact,
                trend_analysis=trend_analysis,
                correlation_analysis=correlation_analysis,
                risk_analysis=risk_analysis,
                performance_metrics=performance_metrics,
                confidence_level=confidence_level,
                metadata={
                    "outcome_count": len(outcomes),
                    "analysis_method": method.value,
                    "time_range": time_range
                }
            )
            
            # Store result
            self.analysis_cache[analysis_id] = analysis_result
            await self._store_analysis_result(analysis_result)
            
            perf_monitor.end_timer(timer, {
                'analysis_type': analysis_type,
                'outcome_count': len(outcomes),
                'success_rate': success_rate
            })
            
            return analysis_result
            
        except Exception as e:
            perf_monitor.end_timer(timer, {'error': str(e)})
            logger.error(f"Error in outcome analysis: {str(e)}")
            raise

    async def get_outcome_insights(self,
                                 user_id: str,
                                 insight_type: str = "performance",
                                 session_id: Optional[str] = None) -> Dict[str, Any]:
        """Get insights about outcomes"""
        try:
            outcomes = await self._get_user_outcomes(user_id, session_id)
            
            if insight_type == "performance":
                return self._generate_performance_insights(outcomes)
            elif insight_type == "patterns":
                return self._generate_pattern_insights(outcomes)
            elif insight_type == "risks":
                return self._generate_risk_insights(outcomes)
            elif insight_type == "opportunities":
                return self._generate_opportunity_insights(outcomes)
            else:
                return self._generate_comprehensive_insights(outcomes)
                
        except Exception as e:
            logger.error(f"Error getting outcome insights: {str(e)}")
            return {}

    async def track_outcome_metrics(self,
                                  outcome_id: str,
                                  user_id: str,
                                  metric_id: str,
                                  value: Union[float, str],
                                  timestamp: Optional[datetime] = None) -> bool:
        """Track a specific metric value over time"""
        try:
            database = get_database()
            if not database:
                return False
            
            tracking_record = {
                "outcome_id": outcome_id,
                "user_id": user_id,
                "metric_id": metric_id,
                "value": value,
                "timestamp": timestamp or datetime.utcnow(),
                "created_at": datetime.utcnow()
            }
            
            await database.outcome_metric_tracking.insert_one(tracking_record)
            
            # Update the outcome record with latest value
            await self.update_outcome_progress(
                outcome_id, user_id, {metric_id: value}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error tracking outcome metric: {str(e)}")
            return False

    async def get_outcome_dashboard(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive outcome dashboard data"""
        try:
            outcomes = await self._get_user_outcomes(user_id)
            
            # Calculate summary statistics
            total_outcomes = len(outcomes)
            completed_outcomes = len([o for o in outcomes if o.status in [
                OutcomeStatus.ACHIEVED, OutcomeStatus.PARTIALLY_ACHIEVED
            ]])
            in_progress_outcomes = len([o for o in outcomes if o.status == OutcomeStatus.IN_PROGRESS])
            
            # Success rate by type
            success_by_type = {}
            for outcome_type in OutcomeType:
                type_outcomes = [o for o in outcomes if o.outcome_type == outcome_type]
                if type_outcomes:
                    successful = len([o for o in type_outcomes if o.status == OutcomeStatus.ACHIEVED])
                    success_by_type[outcome_type.value] = successful / len(type_outcomes)
            
            # Recent activity
            recent_outcomes = sorted(outcomes, key=lambda x: x.updated_at, reverse=True)[:5]
            
            # Performance trends
            monthly_performance = self._calculate_monthly_performance(outcomes)
            
            return {
                "summary": {
                    "total_outcomes": total_outcomes,
                    "completed_outcomes": completed_outcomes,
                    "in_progress_outcomes": in_progress_outcomes,
                    "success_rate": completed_outcomes / total_outcomes if total_outcomes > 0 else 0,
                    "average_impact": statistics.mean([o.impact_score for o in outcomes]) if outcomes else 0
                },
                "success_by_type": success_by_type,
                "recent_activity": [
                    {
                        "id": o.id,
                        "title": o.title,
                        "status": o.status.value,
                        "updated_at": o.updated_at.isoformat()
                    } for o in recent_outcomes
                ],
                "performance_trends": monthly_performance,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating outcome dashboard: {str(e)}")
            return {}

    def _calculate_impact_score(self, outcome: OutcomeRecord) -> float:
        """Calculate impact score for an outcome"""
        try:
            if not outcome.metrics:
                return 0.0
            
            total_score = 0.0
            total_weight = 0.0
            
            for metric in outcome.metrics:
                if metric.actual_value is not None and metric.is_quantitative:
                    # Calculate achievement ratio
                    try:
                        actual = float(metric.actual_value)
                        target = float(metric.target_value)
                        baseline = float(metric.baseline_value) if metric.baseline_value else 0
                        
                        if target != baseline:
                            achievement_ratio = (actual - baseline) / (target - baseline)
                        else:
                            achievement_ratio = 1.0 if actual == target else 0.0
                        
                        # Apply outcome type weight
                        type_weight = self.impact_weights.get(outcome.outcome_type, 1.0)
                        metric_score = min(max(achievement_ratio, 0), 2.0) * metric.weight * type_weight
                        
                        total_score += metric_score
                        total_weight += metric.weight * type_weight
                        
                    except (ValueError, TypeError):
                        continue
            
            return total_score / total_weight if total_weight > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating impact score: {str(e)}")
            return 0.0

    def _calculate_confidence_score(self, outcome: OutcomeRecord) -> float:
        """Calculate confidence score based on data quality and completeness"""
        try:
            confidence_factors = []
            
            # Metric completeness
            if outcome.metrics:
                completed_metrics = len([m for m in outcome.metrics if m.actual_value is not None])
                metric_completeness = completed_metrics / len(outcome.metrics)
                confidence_factors.append(metric_completeness)
            
            # Success criteria clarity
            if outcome.success_criteria:
                confidence_factors.append(0.8)
            else:
                confidence_factors.append(0.4)
            
            # Time factor (more recent = higher confidence)
            days_since_update = (datetime.utcnow() - outcome.updated_at).days
            time_factor = max(0.3, 1.0 - (days_since_update / 365))
            confidence_factors.append(time_factor)
            
            # Status factor
            status_confidence = {
                OutcomeStatus.ACHIEVED: 1.0,
                OutcomeStatus.PARTIALLY_ACHIEVED: 0.8,
                OutcomeStatus.IN_PROGRESS: 0.6,
                OutcomeStatus.NOT_ACHIEVED: 0.7,
                OutcomeStatus.PLANNED: 0.4,
                OutcomeStatus.CANCELLED: 0.3,
                OutcomeStatus.DELAYED: 0.5
            }
            confidence_factors.append(status_confidence.get(outcome.status, 0.5))
            
            return statistics.mean(confidence_factors)
            
        except Exception as e:
            logger.error(f"Error calculating confidence score: {str(e)}")
            return 0.5

    def _calculate_success_rate(self, outcomes: List[OutcomeRecord]) -> float:
        """Calculate overall success rate"""
        if not outcomes:
            return 0.0
        
        successful = len([o for o in outcomes if o.status in [
            OutcomeStatus.ACHIEVED, OutcomeStatus.PARTIALLY_ACHIEVED
        ]])
        
        return successful / len(outcomes)

    def _calculate_average_impact(self, outcomes: List[OutcomeRecord]) -> float:
        """Calculate average impact score"""
        if not outcomes:
            return 0.0
        
        impact_scores = [o.impact_score for o in outcomes if o.impact_score > 0]
        return statistics.mean(impact_scores) if impact_scores else 0.0

    def _perform_trend_analysis(self, outcomes: List[OutcomeRecord]) -> Dict[str, Any]:
        """Perform trend analysis on outcomes"""
        try:
            if len(outcomes) < 3:
                return {"trend_direction": "insufficient_data"}
            
            # Sort by creation date
            sorted_outcomes = sorted(outcomes, key=lambda x: x.created_at)
            
            # Calculate monthly success rates
            monthly_data = defaultdict(list)
            for outcome in sorted_outcomes:
                month_key = outcome.created_at.strftime("%Y-%m")
                success_score = 1.0 if outcome.status == OutcomeStatus.ACHIEVED else 0.5 if outcome.status == OutcomeStatus.PARTIALLY_ACHIEVED else 0.0
                monthly_data[month_key].append(success_score)
            
            # Calculate trend
            monthly_averages = []
            months = sorted(monthly_data.keys())
            
            for month in months:
                avg_success = statistics.mean(monthly_data[month])
                monthly_averages.append(avg_success)
            
            if len(monthly_averages) >= 2:
                # Simple linear trend
                x = list(range(len(monthly_averages)))
                y = monthly_averages
                
                # Calculate slope
                n = len(x)
                slope = (n * sum(x[i] * y[i] for i in range(n)) - sum(x) * sum(y)) / (n * sum(x[i]**2 for i in range(n)) - sum(x)**2)
                
                if slope > 0.05:
                    trend_direction = "improving"
                elif slope < -0.05:
                    trend_direction = "declining"
                else:
                    trend_direction = "stable"
                
                return {
                    "trend_direction": trend_direction,
                    "slope": slope,
                    "monthly_data": dict(monthly_data),
                    "monthly_averages": monthly_averages
                }
            
            return {"trend_direction": "stable"}
            
        except Exception as e:
            logger.error(f"Error in trend analysis: {str(e)}")
            return {"trend_direction": "unknown"}

    def _perform_correlation_analysis(self, outcomes: List[OutcomeRecord]) -> Dict[str, Any]:
        """Perform correlation analysis between different factors"""
        try:
            correlations = {}
            
            # Impact vs Effort correlation
            impact_scores = [o.impact_score for o in outcomes if o.impact_score > 0]
            effort_scores = [o.effort_score for o in outcomes if o.effort_score > 0]
            
            if len(impact_scores) == len(effort_scores) and len(impact_scores) > 2:
                correlation = np.corrcoef(impact_scores, effort_scores)[0, 1]
                correlations["impact_vs_effort"] = float(correlation) if not np.isnan(correlation) else 0.0
            
            # Success rate by outcome type
            type_success = {}
            for outcome_type in OutcomeType:
                type_outcomes = [o for o in outcomes if o.outcome_type == outcome_type]
                if type_outcomes:
                    success_rate = len([o for o in type_outcomes if o.status == OutcomeStatus.ACHIEVED]) / len(type_outcomes)
                    type_success[outcome_type.value] = success_rate
            
            correlations["success_by_type"] = type_success
            
            return correlations
            
        except Exception as e:
            logger.error(f"Error in correlation analysis: {str(e)}")
            return {}

    def _perform_risk_analysis(self, outcomes: List[OutcomeRecord]) -> Dict[str, Any]:
        """Perform risk analysis on outcomes"""
        try:
            risk_analysis = {}
            
            # Common risk factors
            all_risk_factors = []
            for outcome in outcomes:
                all_risk_factors.extend(outcome.risk_factors)
            
            risk_frequency = Counter(all_risk_factors)
            risk_analysis["common_risks"] = dict(risk_frequency.most_common(5))
            
            # Outcomes with high risk
            high_risk_outcomes = [o for o in outcomes if len(o.risk_factors) > 3]
            risk_analysis["high_risk_count"] = len(high_risk_outcomes)
            
            # Risk impact on success
            risky_outcomes = [o for o in outcomes if o.risk_factors]
            if risky_outcomes:
                risky_success_rate = len([o for o in risky_outcomes if o.status == OutcomeStatus.ACHIEVED]) / len(risky_outcomes)
                risk_analysis["risky_success_rate"] = risky_success_rate
            
            return risk_analysis
            
        except Exception as e:
            logger.error(f"Error in risk analysis: {str(e)}")
            return {}

    def _calculate_performance_metrics(self, outcomes: List[OutcomeRecord]) -> Dict[str, float]:
        """Calculate various performance metrics"""
        try:
            metrics = {}
            
            if not outcomes:
                return metrics
            
            # Completion rate
            completed = len([o for o in outcomes if o.status in [
                OutcomeStatus.ACHIEVED, OutcomeStatus.PARTIALLY_ACHIEVED, OutcomeStatus.NOT_ACHIEVED
            ]])
            metrics["completion_rate"] = completed / len(outcomes)
            
            # On-time delivery rate
            on_time_outcomes = []
            for outcome in outcomes:
                if outcome.expected_completion_date and outcome.actual_completion_date:
                    if outcome.actual_completion_date <= outcome.expected_completion_date:
                        on_time_outcomes.append(outcome)
            
            if any(o.expected_completion_date for o in outcomes):
                metrics["on_time_rate"] = len(on_time_outcomes) / len([o for o in outcomes if o.expected_completion_date])
            
            # Average confidence
            confidence_scores = [o.confidence_score for o in outcomes if o.confidence_score > 0]
            if confidence_scores:
                metrics["average_confidence"] = statistics.mean(confidence_scores)
            
            # Quality score (based on metrics completeness)
            quality_scores = []
            for outcome in outcomes:
                if outcome.metrics:
                    completed_metrics = len([m for m in outcome.metrics if m.actual_value is not None])
                    quality_score = completed_metrics / len(outcome.metrics)
                    quality_scores.append(quality_score)
            
            if quality_scores:
                metrics["data_quality_score"] = statistics.mean(quality_scores)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating performance metrics: {str(e)}")
            return {}

    def _generate_recommendations(self,
                                outcomes: List[OutcomeRecord],
                                success_rate: float,
                                average_impact: float,
                                trend_analysis: Dict[str, Any],
                                risk_analysis: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        recommendations = []
        
        # Success rate recommendations
        if success_rate < 0.6:
            recommendations.append("Consider reviewing and refining success criteria to improve outcome achievement")
            recommendations.append("Implement more frequent progress monitoring and course correction")
        elif success_rate > 0.8:
            recommendations.append("Excellent success rate - consider setting more ambitious targets")
        
        # Impact recommendations
        if average_impact < 0.5:
            recommendations.append("Focus on higher-impact initiatives to maximize strategic value")
        
        # Trend recommendations
        trend_direction = trend_analysis.get("trend_direction")
        if trend_direction == "declining":
            recommendations.append("Address declining performance trend through process improvements")
        elif trend_direction == "improving":
            recommendations.append("Maintain current positive trajectory and identify success factors to replicate")
        
        # Risk recommendations
        common_risks = risk_analysis.get("common_risks", {})
        if common_risks:
            top_risk = max(common_risks.keys(), key=lambda k: common_risks[k])
            recommendations.append(f"Develop mitigation strategies for '{top_risk}' - the most common risk factor")
        
        # Data quality recommendations
        incomplete_outcomes = [o for o in outcomes if not all(m.actual_value is not None for m in o.metrics)]
        if len(incomplete_outcomes) > len(outcomes) * 0.3:
            recommendations.append("Improve data collection processes - many outcomes have incomplete metrics")
        
        return recommendations[:5]  # Limit to top 5 recommendations

    def _calculate_analysis_confidence(self, outcomes: List[OutcomeRecord], method: AnalysisMethod) -> float:
        """Calculate confidence level for the analysis"""
        try:
            confidence_factors = []
            
            # Sample size factor
            sample_size_factor = min(len(outcomes) / 20, 1.0)  # Optimal at 20+ outcomes
            confidence_factors.append(sample_size_factor)
            
            # Data completeness factor
            complete_outcomes = len([o for o in outcomes if all(m.actual_value is not None for m in o.metrics)])
            completeness_factor = complete_outcomes / len(outcomes) if outcomes else 0
            confidence_factors.append(completeness_factor)
            
            # Method factor
            method_confidence = {
                AnalysisMethod.QUANTITATIVE: 0.9,
                AnalysisMethod.QUALITATIVE: 0.7,
                AnalysisMethod.MIXED_METHOD: 0.8,
                AnalysisMethod.COMPARATIVE: 0.8,
                AnalysisMethod.TREND_ANALYSIS: 0.7,
                AnalysisMethod.CORRELATION: 0.8,
                AnalysisMethod.REGRESSION: 0.9
            }
            confidence_factors.append(method_confidence.get(method, 0.7))
            
            # Time recency factor
            recent_outcomes = [o for o in outcomes if (datetime.utcnow() - o.updated_at).days < 90]
            recency_factor = len(recent_outcomes) / len(outcomes) if outcomes else 0
            confidence_factors.append(recency_factor)
            
            return statistics.mean(confidence_factors)
            
        except Exception as e:
            logger.error(f"Error calculating analysis confidence: {str(e)}")
            return 0.5

    def _calculate_monthly_performance(self, outcomes: List[OutcomeRecord]) -> Dict[str, float]:
        """Calculate monthly performance trends"""
        try:
            monthly_data = defaultdict(list)
            
            for outcome in outcomes:
                month_key = outcome.created_at.strftime("%Y-%m")
                success_score = 1.0 if outcome.status == OutcomeStatus.ACHIEVED else 0.5 if outcome.status == OutcomeStatus.PARTIALLY_ACHIEVED else 0.0
                monthly_data[month_key].append(success_score)
            
            monthly_averages = {}
            for month, scores in monthly_data.items():
                monthly_averages[month] = statistics.mean(scores)
            
            return monthly_averages
            
        except Exception as e:
            logger.error(f"Error calculating monthly performance: {str(e)}")
            return {}

    def _generate_performance_insights(self, outcomes: List[OutcomeRecord]) -> Dict[str, Any]:
        """Generate performance-focused insights"""
        insights = {
            "total_outcomes": len(outcomes),
            "success_rate": self._calculate_success_rate(outcomes),
            "average_impact": self._calculate_average_impact(outcomes),
            "performance_by_type": {},
            "top_performers": [],
            "improvement_areas": []
        }
        
        # Performance by outcome type
        for outcome_type in OutcomeType:
            type_outcomes = [o for o in outcomes if o.outcome_type == outcome_type]
            if type_outcomes:
                success_rate = len([o for o in type_outcomes if o.status == OutcomeStatus.ACHIEVED]) / len(type_outcomes)
                avg_impact = statistics.mean([o.impact_score for o in type_outcomes if o.impact_score > 0]) or 0
                insights["performance_by_type"][outcome_type.value] = {
                    "success_rate": success_rate,
                    "average_impact": avg_impact,
                    "count": len(type_outcomes)
                }
        
        # Top performers
        top_outcomes = sorted(outcomes, key=lambda x: x.impact_score, reverse=True)[:3]
        insights["top_performers"] = [
            {"id": o.id, "title": o.title, "impact_score": o.impact_score}
            for o in top_outcomes
        ]
        
        return insights

    def _generate_pattern_insights(self, outcomes: List[OutcomeRecord]) -> Dict[str, Any]:
        """Generate pattern-focused insights"""
        return {
            "common_success_factors": self._identify_success_patterns(outcomes),
            "failure_patterns": self._identify_failure_patterns(outcomes),
            "timing_patterns": self._analyze_timing_patterns(outcomes),
            "resource_patterns": self._analyze_resource_patterns(outcomes)
        }

    def _generate_risk_insights(self, outcomes: List[OutcomeRecord]) -> Dict[str, Any]:
        """Generate risk-focused insights"""
        return self._perform_risk_analysis(outcomes)

    def _generate_opportunity_insights(self, outcomes: List[OutcomeRecord]) -> Dict[str, Any]:
        """Generate opportunity-focused insights"""
        return {
            "underperforming_areas": self._identify_underperforming_areas(outcomes),
            "high_potential_areas": self._identify_high_potential_areas(outcomes),
            "resource_optimization": self._suggest_resource_optimization(outcomes)
        }

    def _generate_comprehensive_insights(self, outcomes: List[OutcomeRecord]) -> Dict[str, Any]:
        """Generate comprehensive insights combining all types"""
        return {
            "performance": self._generate_performance_insights(outcomes),
            "patterns": self._generate_pattern_insights(outcomes),
            "risks": self._generate_risk_insights(outcomes),
            "opportunities": self._generate_opportunity_insights(outcomes)
        }

    def _identify_success_patterns(self, outcomes: List[OutcomeRecord]) -> List[str]:
        """Identify common patterns in successful outcomes"""
        successful_outcomes = [o for o in outcomes if o.status == OutcomeStatus.ACHIEVED]
        patterns = []
        
        if successful_outcomes:
            # Analyze common characteristics
            avg_confidence = statistics.mean([o.confidence_score for o in successful_outcomes])
            if avg_confidence > 0.7:
                patterns.append("High confidence scores correlate with success")
            
            # Analyze outcome types
            type_counts = Counter([o.outcome_type for o in successful_outcomes])
            if type_counts:
                most_common_type = type_counts.most_common(1)[0]
                patterns.append(f"{most_common_type[0].value} outcomes show highest success rate")
        
        return patterns

    def _identify_failure_patterns(self, outcomes: List[OutcomeRecord]) -> List[str]:
        """Identify common patterns in failed outcomes"""
        failed_outcomes = [o for o in outcomes if o.status == OutcomeStatus.NOT_ACHIEVED]
        patterns = []
        
        if failed_outcomes:
            # Analyze common risk factors
            all_risks = []
            for outcome in failed_outcomes:
                all_risks.extend(outcome.risk_factors)
            
            if all_risks:
                risk_counts = Counter(all_risks)
                top_risk = risk_counts.most_common(1)[0]
                patterns.append(f"'{top_risk[0]}' is the most common risk in failed outcomes")
        
        return patterns

    def _analyze_timing_patterns(self, outcomes: List[OutcomeRecord]) -> Dict[str, Any]:
        """Analyze timing patterns in outcomes"""
        timing_data = {}
        
        # Completion time analysis
        completed_outcomes = [o for o in outcomes if o.actual_completion_date and o.expected_completion_date]
        if completed_outcomes:
            delays = [(o.actual_completion_date - o.expected_completion_date).days for o in completed_outcomes]
            timing_data["average_delay_days"] = statistics.mean(delays)
            timing_data["on_time_rate"] = len([d for d in delays if d <= 0]) / len(delays)
        
        return timing_data

    def _analyze_resource_patterns(self, outcomes: List[OutcomeRecord]) -> Dict[str, Any]:
        """Analyze resource utilization patterns"""
        return {
            "high_effort_outcomes": len([o for o in outcomes if o.effort_score > 0.8]),
            "low_effort_high_impact": len([o for o in outcomes if o.effort_score < 0.5 and o.impact_score > 0.7]),
            "efficiency_opportunities": "Focus on low-effort, high-impact initiatives"
        }

    def _identify_underperforming_areas(self, outcomes: List[OutcomeRecord]) -> List[str]:
        """Identify areas with poor performance"""
        areas = []
        
        for outcome_type in OutcomeType:
            type_outcomes = [o for o in outcomes if o.outcome_type == outcome_type]
            if type_outcomes:
                success_rate = len([o for o in type_outcomes if o.status == OutcomeStatus.ACHIEVED]) / len(type_outcomes)
                if success_rate < 0.5:
                    areas.append(f"{outcome_type.value} outcomes have low success rate ({success_rate:.1%})")
        
        return areas

    def _identify_high_potential_areas(self, outcomes: List[OutcomeRecord]) -> List[str]:
        """Identify areas with high potential"""
        areas = []
        
        for outcome_type in OutcomeType:
            type_outcomes = [o for o in outcomes if o.outcome_type == outcome_type]
            if type_outcomes:
                avg_impact = statistics.mean([o.impact_score for o in type_outcomes if o.impact_score > 0]) or 0
                if avg_impact > 0.8:
                    areas.append(f"{outcome_type.value} outcomes show high impact potential")
        
        return areas

    def _suggest_resource_optimization(self, outcomes: List[OutcomeRecord]) -> List[str]:
        """Suggest resource optimization opportunities"""
        suggestions = []
        
        # High effort, low impact outcomes
        inefficient_outcomes = [o for o in outcomes if o.effort_score > 0.7 and o.impact_score < 0.5]
        if inefficient_outcomes:
            suggestions.append("Review resource allocation for high-effort, low-impact initiatives")
        
        # Low effort, high impact opportunities
        efficient_outcomes = [o for o in outcomes if o.effort_score < 0.5 and o.impact_score > 0.7]
        if efficient_outcomes:
            suggestions.append("Scale up low-effort, high-impact initiatives")
        
        return suggestions

    async def _get_outcome_record(self, outcome_id: str, user_id: str) -> Optional[OutcomeRecord]:
        """Get outcome record from cache or database"""
        if outcome_id in self.outcome_cache:
            return self.outcome_cache[outcome_id]
        
        try:
            database = get_database()
            if not database:
                return None
            
            outcome_doc = await database.outcome_records.find_one({
                "id": outcome_id,
                "user_id": user_id
            })
            
            if outcome_doc:
                # Convert back to OutcomeRecord (simplified)
                return OutcomeRecord(**outcome_doc)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting outcome record: {str(e)}")
            return None

    async def _get_outcomes_for_analysis(self,
                                       user_id: str,
                                       session_id: Optional[str] = None,
                                       outcome_ids: List[str] = None,
                                       time_range: Optional[Tuple[datetime, datetime]] = None) -> List[OutcomeRecord]:
        """Get outcomes for analysis based on criteria"""
        try:
            database = get_database()
            if not database:
                return []
            
            query = {"user_id": user_id}
            
            if session_id:
                query["session_id"] = session_id
            
            if outcome_ids:
                query["id"] = {"$in": outcome_ids}
            
            if time_range:
                query["created_at"] = {
                    "$gte": time_range[0],
                    "$lte": time_range[1]
                }
            
            cursor = database.outcome_records.find(query)
            outcome_docs = await cursor.to_list(length=None)
            
            outcomes = []
            for doc in outcome_docs:
                # Convert back to OutcomeRecord (simplified)
                outcome = OutcomeRecord(**doc)
                outcomes.append(outcome)
            
            return outcomes
            
        except Exception as e:
            logger.error(f"Error getting outcomes for analysis: {str(e)}")
            return []

    async def _get_user_outcomes(self, user_id: str, session_id: Optional[str] = None) -> List[OutcomeRecord]:
        """Get all outcomes for a user"""
        return await self._get_outcomes_for_analysis(user_id, session_id)

    async def _store_outcome_record(self, outcome: OutcomeRecord) -> None:
        """Store outcome record in database"""
        try:
            database = get_database()
            if not database:
                return
            
            outcome_doc = asdict(outcome)
            outcome_doc["outcome_type"] = outcome.outcome_type.value
            outcome_doc["status"] = outcome.status.value
            
            await database.outcome_records.insert_one(outcome_doc)
            
        except Exception as e:
            logger.error(f"Error storing outcome record: {str(e)}")

    async def _update_outcome_record(self, outcome: OutcomeRecord) -> None:
        """Update outcome record in database"""
        try:
            database = get_database()
            if not database:
                return
            
            outcome_doc = asdict(outcome)
            outcome_doc["outcome_type"] = outcome.outcome_type.value
            outcome_doc["status"] = outcome.status.value
            
            await database.outcome_records.update_one(
                {"id": outcome.id},
                {"$set": outcome_doc}
            )
            
        except Exception as e:
            logger.error(f"Error updating outcome record: {str(e)}")

    async def _store_analysis_result(self, result: AnalysisResult) -> None:
        """Store analysis result in database"""
        try:
            database = get_database()
            if not database:
                return
            
            result_doc = asdict(result)
            result_doc["method"] = result.method.value
            
            await database.outcome_analysis_results.insert_one(result_doc)
            
        except Exception as e:
            logger.error(f"Error storing analysis result: {str(e)}")


# Global service instance
outcome_analysis_service = OutcomeAnalysisService()


# Utility functions for easy access
async def create_outcome(user_id: str,
                        title: str,
                        description: str,
                        outcome_type: str,
                        metrics: List[Dict[str, Any]],
                        **kwargs) -> str:
    """Utility function to create outcome record"""
    return await outcome_analysis_service.create_outcome_record(
        user_id=user_id,
        title=title,
        description=description,
        outcome_type=OutcomeType(outcome_type),
        metrics=metrics,
        **kwargs
    )


async def analyze_user_outcomes(user_id: str,
                               analysis_type: str = "comprehensive",
                               **kwargs) -> AnalysisResult:
    """Utility function to analyze outcomes"""
    return await outcome_analysis_service.analyze_outcomes(
        user_id=user_id,
        analysis_type=analysis_type,
        **kwargs
    )


async def get_outcome_dashboard(user_id: str) -> Dict[str, Any]:
    """Utility function to get outcome dashboard"""
    return await outcome_analysis_service.get_outcome_dashboard(user_id)