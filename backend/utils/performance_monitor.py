import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from functools import wraps

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Monitor and log performance metrics for AI chat system"""
    
    def __init__(self):
        self.metrics: Dict[str, Any] = {}
    
    def start_timer(self, operation: str) -> str:
        """Start timing an operation"""
        timer_id = f"{operation}_{int(time.time() * 1000)}"
        self.metrics[timer_id] = {
            'operation': operation,
            'start_time': time.time(),
            'timestamp': datetime.utcnow().isoformat()
        }
        logger.info(f"🚀 [PERF] Starting {operation} (ID: {timer_id})")
        return timer_id
    
    def end_timer(self, timer_id: str, additional_data: Optional[Dict] = None) -> float:
        """End timing an operation and log results"""
        if timer_id not in self.metrics:
            logger.warning(f"⚠️ [PERF] Timer {timer_id} not found")
            return 0.0
        
        end_time = time.time()
        duration = end_time - self.metrics[timer_id]['start_time']
        operation = self.metrics[timer_id]['operation']
        
        self.metrics[timer_id].update({
            'end_time': end_time,
            'duration_seconds': duration,
            'duration_ms': duration * 1000,
            'additional_data': additional_data or {}
        })
        
        # Log with appropriate severity based on duration
        if duration > 10:  # > 10 seconds
            logger.error(f"🐌 [PERF] SLOW: {operation} took {duration:.2f}s (ID: {timer_id})")
        elif duration > 5:  # > 5 seconds
            logger.warning(f"⚠️ [PERF] MODERATE: {operation} took {duration:.2f}s (ID: {timer_id})")
        else:
            logger.info(f"✅ [PERF] {operation} completed in {duration:.2f}s (ID: {timer_id})")
        
        if additional_data:
            logger.info(f"📊 [PERF] Additional data for {timer_id}: {additional_data}")
        
        return duration
    
    def log_api_metrics(self, 
                       model: str, 
                       input_tokens: int, 
                       response_tokens: Optional[int] = None,
                       duration: float = 0.0,
                       success: bool = True):
        """Log API-specific metrics"""
        logger.info(f"🤖 [API-METRICS] Model: {model}, Input: {input_tokens} tokens, "
                   f"Response: {response_tokens or 'unknown'} tokens, "
                   f"Duration: {duration:.2f}s, Success: {success}")
    
    def log_document_processing(self, 
                              document_count: int, 
                              total_chars: int, 
                              processing_time: float):
        """Log document processing metrics"""
        logger.info(f"📄 [DOC-METRICS] Documents: {document_count}, "
                   f"Total chars: {total_chars}, Processing: {processing_time:.2f}s")

# Global instance
perf_monitor = PerformanceMonitor()

def monitor_performance(operation_name: str):
    """Decorator to monitor function performance"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            timer_id = perf_monitor.start_timer(operation_name)
            try:
                result = await func(*args, **kwargs)
                perf_monitor.end_timer(timer_id, {'success': True})
                return result
            except Exception as e:
                perf_monitor.end_timer(timer_id, {'success': False, 'error': str(e)})
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            timer_id = perf_monitor.start_timer(operation_name)
            try:
                result = func(*args, **kwargs)
                perf_monitor.end_timer(timer_id, {'success': True})
                return result
            except Exception as e:
                perf_monitor.end_timer(timer_id, {'success': False, 'error': str(e)})
                raise
        
        return async_wrapper if hasattr(func, '__code__') and func.__code__.co_flags & 0x80 else sync_wrapper
    return decorator