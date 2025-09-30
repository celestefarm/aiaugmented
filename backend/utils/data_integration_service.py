
"""
Data Integration Service
Handles integration of various data sources, formats, and external APIs
for strategic analysis and decision-making
"""

import asyncio
import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Tuple
from enum import Enum
from dataclasses import dataclass, asdict
import httpx
import io
import csv
from urllib.parse import urlparse, parse_qs

from backend.database_memory import get_database
from backend.utils.document_processor import DocumentProcessor
from backend.utils.easyocr_service import easyocr_service
from backend.utils.performance_monitor import perf_monitor
from bson import ObjectId

logger = logging.getLogger(__name__)


class DataSourceType(Enum):
    """Types of data sources supported"""
    DOCUMENT = "document"
    API = "api"
    DATABASE = "database"
    SPREADSHEET = "spreadsheet"
    WEB_SCRAPING = "web_scraping"
    FILE_UPLOAD = "file_upload"
    REAL_TIME_FEED = "real_time_feed"
    EXTERNAL_SERVICE = "external_service"


class DataFormat(Enum):
    """Supported data formats"""
    JSON = "json"
    CSV = "csv"
    XML = "xml"
    EXCEL = "excel"
    PDF = "pdf"
    TEXT = "text"
    IMAGE = "image"
    HTML = "html"
    YAML = "yaml"


class IntegrationStatus(Enum):
    """Status of data integration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"
    SCHEDULED = "scheduled"


@dataclass
class DataSource:
    """Configuration for a data source"""
    id: str
    name: str
    source_type: DataSourceType
    format: DataFormat
    endpoint_url: Optional[str] = None
    authentication: Optional[Dict[str, Any]] = None
    headers: Optional[Dict[str, str]] = None
    parameters: Optional[Dict[str, Any]] = None
    refresh_interval: Optional[int] = None  # in minutes
    is_active: bool = True
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class IntegrationResult:
    """Result of data integration operation"""
    source_id: str
    status: IntegrationStatus
    data: Optional[Dict[str, Any]] = None
    raw_data: Optional[Any] = None
    processed_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    processing_time: float = 0.0
    record_count: int = 0
    data_quality_score: float = 0.0
    timestamp: datetime = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()
        if self.metadata is None:
            self.metadata = {}


class DataIntegrationService:
    """Comprehensive data integration service"""
    
    def __init__(self):
        self.data_sources: Dict[str, DataSource] = {}
        self.integration_cache: Dict[str, IntegrationResult] = {}
        self.scheduled_integrations: Dict[str, datetime] = {}
        
        # HTTP client for API calls
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
        # Data quality thresholds
        self.quality_thresholds = {
            "completeness": 0.8,
            "accuracy": 0.9,
            "consistency": 0.85,
            "timeliness": 0.7
        }

    async def register_data_source(self, 
                                  name: str,
                                  source_type: DataSourceType,
                                  format: DataFormat,
                                  endpoint_url: Optional[str] = None,
                                  authentication: Optional[Dict[str, Any]] = None,
                                  headers: Optional[Dict[str, str]] = None,
                                  parameters: Optional[Dict[str, Any]] = None,
                                  refresh_interval: Optional[int] = None,
                                  metadata: Optional[Dict[str, Any]] = None) -> str:
        """Register a new data source"""
        try:
            source_id = f"{source_type.value}_{name}_{int(datetime.utcnow().timestamp())}"
            
            data_source = DataSource(
                id=source_id,
                name=name,
                source_type=source_type,
                format=format,
                endpoint_url=endpoint_url,
                authentication=authentication,
                headers=headers,
                parameters=parameters,
                refresh_interval=refresh_interval,
                metadata=metadata or {}
            )
            
            self.data_sources[source_id] = data_source
            
            # Store in database
            database = get_database()
            if database:
                await database.data_sources.insert_one({
                    **asdict(data_source),
                    "source_type": source_type.value,
                    "format": format.value,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                })
            
            logger.info(f"Registered data source: {source_id}")
            return source_id
            
        except Exception as e:
            logger.error(f"Error registering data source: {str(e)}")
            raise

    async def integrate_data(self, 
                           source_id: str,
                           user_id: str,
                           session_id: Optional[str] = None,
                           force_refresh: bool = False) -> IntegrationResult:
        """Integrate data from a specific source"""
        timer = perf_monitor.start_timer(f"data_integration_{source_id}")
        
        try:
            if source_id not in self.data_sources:
                raise ValueError(f"Data source {source_id} not found")
            
            data_source = self.data_sources[source_id]
            
            # Check cache if not forcing refresh
            if not force_refresh and source_id in self.integration_cache:
                cached_result = self.integration_cache[source_id]
                if self._is_cache_valid(cached_result, data_source):
                    logger.info(f"Using cached data for source {source_id}")
                    return cached_result
            
            # Perform integration based on source type
            result = await self._perform_integration(data_source, user_id, session_id)
            
            # Cache the result
            self.integration_cache[source_id] = result
            
            # Store result in database
            await self._store_integration_result(result, user_id, session_id)
            
            perf_monitor.end_timer(timer, {
                'source_id': source_id,
                'status': result.status.value,
                'record_count': result.record_count
            })
            
            return result
            
        except Exception as e:
            error_result = IntegrationResult(
                source_id=source_id,
                status=IntegrationStatus.FAILED,
                error_message=str(e),
                processing_time=perf_monitor.end_timer(timer, {'error': str(e)})
            )
            
            logger.error(f"Data integration failed for {source_id}: {str(e)}")
            return error_result

    async def integrate_multiple_sources(self,
                                       source_ids: List[str],
                                       user_id: str,
                                       session_id: Optional[str] = None,
                                       merge_strategy: str = "union") -> Dict[str, IntegrationResult]:
        """Integrate data from multiple sources"""
        try:
            # Run integrations concurrently
            tasks = [
                self.integrate_data(source_id, user_id, session_id)
                for source_id in source_ids
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            integration_results = {}
            for i, result in enumerate(results):
                source_id = source_ids[i]
                if isinstance(result, Exception):
                    integration_results[source_id] = IntegrationResult(
                        source_id=source_id,
                        status=IntegrationStatus.FAILED,
                        error_message=str(result)
                    )
                else:
                    integration_results[source_id] = result
            
            # Merge successful results if requested
            if merge_strategy != "none":
                merged_data = await self._merge_integration_results(
                    [r for r in integration_results.values() if r.status == IntegrationStatus.COMPLETED],
                    merge_strategy
                )
                
                # Store merged result
                if merged_data:
                    merged_result = IntegrationResult(
                        source_id="merged_" + "_".join(source_ids),
                        status=IntegrationStatus.COMPLETED,
                        processed_data=merged_data,
                        record_count=sum(r.record_count for r in integration_results.values()),
                        metadata={"merge_strategy": merge_strategy, "source_count": len(source_ids)}
                    )
                    integration_results["merged"] = merged_result
            
            return integration_results
            
        except Exception as e:
            logger.error(f"Multiple source integration failed: {str(e)}")
            raise

    async def process_file_upload(self,
                                file_content: bytes,
                                filename: str,
                                content_type: str,
                                user_id: str,
                                session_id: Optional[str] = None) -> IntegrationResult:
        """Process uploaded file and integrate data"""
        try:
            # Determine file format
            file_format = self._detect_file_format(filename, content_type)
            
            # Process based on format
            if file_format in [DataFormat.PDF, DataFormat.IMAGE]:
                # Use document processor for PDFs and images
                processed_data = await DocumentProcessor.process_document(
                    file_content, filename, content_type
                )
                
                result = IntegrationResult(
                    source_id=f"upload_{filename}_{int(datetime.utcnow().timestamp())}",
                    status=IntegrationStatus.COMPLETED,
                    processed_data=processed_data,
                    record_count=1,
                    data_quality_score=0.8,
                    metadata={"filename": filename, "content_type": content_type}
                )
                
            elif file_format == DataFormat.CSV:
                # Process CSV data
                processed_data = await self._process_csv_data(file_content, filename)
                
                result = IntegrationResult(
                    source_id=f"upload_{filename}_{int(datetime.utcnow().timestamp())}",
                    status=IntegrationStatus.COMPLETED,
                    processed_data=processed_data,
                    record_count=len(processed_data.get("rows", [])),
                    data_quality_score=self._assess_data_quality(processed_data),
                    metadata={"filename": filename, "format": "csv"}
                )
                
            elif file_format == DataFormat.EXCEL:
                # Process Excel data
                processed_data = await self._process_excel_data(file_content, filename)
                
                result = IntegrationResult(
                    source_id=f"upload_{filename}_{int(datetime.utcnow().timestamp())}",
                    status=IntegrationStatus.COMPLETED,
                    processed_data=processed_data,
                    record_count=sum(len(sheet.get("rows", [])) for sheet in processed_data.get("sheets", {}).values()),
                    data_quality_score=self._assess_data_quality(processed_data),
                    metadata={"filename": filename, "format": "excel"}
                )
                
            elif file_format == DataFormat.JSON:
                # Process JSON data
                processed_data = await self._process_json_data(file_content, filename)
                
                result = IntegrationResult(
                    source_id=f"upload_{filename}_{int(datetime.utcnow().timestamp())}",
                    status=IntegrationStatus.COMPLETED,
                    processed_data=processed_data,
                    record_count=self._count_json_records(processed_data),
                    data_quality_score=self._assess_data_quality(processed_data),
                    metadata={"filename": filename, "format": "json"}
                )
                
            else:
                # Process as text
                processed_data = await self._process_text_data(file_content, filename)
                
                result = IntegrationResult(
                    source_id=f"upload_{filename}_{int(datetime.utcnow().timestamp())}",
                    status=IntegrationStatus.COMPLETED,
                    processed_data=processed_data,
                    record_count=1,
                    data_quality_score=0.7,
                    metadata={"filename": filename, "format": "text"}
                )
            
            # Store result
            await self._store_integration_result(result, user_id, session_id)
            
            return result
            
        except Exception as e:
            logger.error(f"File upload processing failed: {str(e)}")
            return IntegrationResult(
                source_id=f"upload_{filename}_failed",
                status=IntegrationStatus.FAILED,
                error_message=str(e)
            )

    async def integrate_api_data(self,
                               api_url: str,
                               method: str = "GET",
                               headers: Optional[Dict[str, str]] = None,
                               params: Optional[Dict[str, Any]] = None,
                               data: Optional[Dict[str, Any]] = None,
                               auth_token: Optional[str] = None) -> IntegrationResult:
        """Integrate data from external API"""
        try:
            # Prepare headers
            request_headers = headers or {}
            if auth_token:
                request_headers["Authorization"] = f"Bearer {auth_token}"
            
            # Make API request
            if method.upper() == "GET":
                response = await self.http_client.get(api_url, headers=request_headers, params=params)
            elif method.upper() == "POST":
                response = await self.http_client.post(api_url, headers=request_headers, json=data, params=params)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            
            # Process response
            content_type = response.headers.get("content-type", "").lower()
            
            if "application/json" in content_type:
                raw_data = response.json()
            elif "text/csv" in content_type:
                raw_data = response.text
            else:
                raw_data = response.text
            
            # Process and structure data
            processed_data = await self._process_api_response(raw_data, content_type, api_url)
            
            return IntegrationResult(
                source_id=f"api_{urlparse(api_url).netloc}_{int(datetime.utcnow().timestamp())}",
                status=IntegrationStatus.COMPLETED,
                raw_data=raw_data,
                processed_data=processed_data,
                record_count=self._count_api_records(processed_data),
                data_quality_score=self._assess_data_quality(processed_data),
                metadata={
                    "api_url": api_url,
                    "method": method,
                    "status_code": response.status_code,
                    "content_type": content_type
                }
            )
            
        except Exception as e:
            logger.error(f"API integration failed for {api_url}: {str(e)}")
            return IntegrationResult(
                source_id=f"api_{urlparse(api_url).netloc}_failed",
                status=IntegrationStatus.FAILED,
                error_message=str(e)
            )

    async def get_integration_history(self,
                                    user_id: str,
                                    session_id: Optional[str] = None,
                                    limit: int = 50) -> List[IntegrationResult]:
        """Get integration history for a user/session"""
        try:
            database = get_database()
            if not database:
                return []
            
            query = {"user_id": user_id}
            if session_id:
                query["session_id"] = session_id
            
            cursor = database.integration_results.find(query).sort("timestamp", -1).limit(limit)
            results = await cursor.to_list(length=limit)
            
            integration_results = []
            for result in results:
                # Convert back to IntegrationResult
                integration_result = IntegrationResult(
                    source_id=result["source_id"],
                    status=IntegrationStatus(result["status"]),
                    data=result.get("data"),
                    processed_data=result.get("processed_data"),
                    error_message=result.get("error_message"),
                    processing_time=result.get("processing_time", 0.0),
                    record_count=result.get("record_count", 0),
                    data_quality_score=result.get("data_quality_score", 0.0),
                    timestamp=result.get("timestamp", datetime.utcnow()),
                    metadata=result.get("metadata", {})
                )
                integration_results.append(integration_result)
            
            return integration_results
            
        except Exception as e:
            logger.error(f"Error getting integration history: {str(e)}")
            return []

    async def _perform_integration(self,
                                 data_source: DataSource,
                                 user_id: str,
                                 session_id: Optional[str]) -> IntegrationResult:
        """Perform integration based on data source type"""
        start_time = datetime.utcnow()
        
        try:
            if data_source.source_type == DataSourceType.API:
                result = await self._integrate_api_source(data_source)
            elif data_source.source_type == DataSourceType.DATABASE:
                result = await self._integrate_database_source(data_source)
            elif data_source.source_type == DataSourceType.WEB_SCRAPING:
                result = await self._integrate_web_scraping_source(data_source)
            elif data_source.source_type == DataSourceType.EXTERNAL_SERVICE:
                result = await self._integrate_external_service(data_source)
            else:
                raise ValueError(f"Unsupported source type: {data_source.source_type}")
            
            # Calculate processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            result.processing_time = processing_time
            
            return result
            
        except Exception as e:
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            return IntegrationResult(
                source_id=data_source.id,
                status=IntegrationStatus.FAILED,
                error_message=str(e),
                processing_time=processing_time
            )

    async def _integrate_api_source(self, data_source: DataSource) -> IntegrationResult:
        """Integrate data from API source"""
        if not data_source.endpoint_url:
            raise ValueError("API endpoint URL is required")
        
        return await self.integrate_api_data(
            api_url=data_source.endpoint_url,
            headers=data_source.headers,
            params=data_source.parameters,
            auth_token=data_source.authentication.get("token") if data_source.authentication else None
        )

    async def _integrate_database_source(self, data_source: DataSource) -> IntegrationResult:
        """Integrate data from database source"""
        # This would integrate with external databases
        # For now, return a placeholder implementation
        return IntegrationResult(
            source_id=data_source.id,
            status=IntegrationStatus.COMPLETED,
            processed_data={"message": "Database integration not yet implemented"},
            record_count=0,
            data_quality_score=0.0
        )

    async def _integrate_web_scraping_source(self, data_source: DataSource) -> IntegrationResult:
        """Integrate data from web scraping"""
        # This would implement web scraping functionality
        # For now, return a placeholder implementation
        return IntegrationResult(
            source_id=data_source.id,
            status=IntegrationStatus.COMPLETED,
            processed_data={"message": "Web scraping integration not yet implemented"},
            record_count=0,
            data_quality_score=0.0
        )

    async def _integrate_external_service(self, data_source: DataSource) -> IntegrationResult:
        """Integrate data from external service"""
        # This would integrate with various external services
        # For now, return a placeholder implementation
        return IntegrationResult(
            source_id=data_source.id,
            status=IntegrationStatus.COMPLETED,
            processed_data={"message": "External service integration not yet implemented"},
            record_count=0,
            data_quality_score=0.0
        )

    async def _process_csv_data(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Process CSV file data"""
        try:
            # Decode content
            content_str = file_content.decode('utf-8')
            
            # Parse CSV
            csv_reader = csv.DictReader(io.StringIO(content_str))
            rows = list(csv_reader)
            
            # Extract column information
            columns = csv_reader.fieldnames or []
            
            return {
                "filename": filename,
                "format": "csv",
                "columns": columns,
                "rows": rows,
                "row_count": len(rows),
                "column_count": len(columns),
                "sample_data": rows[:5] if rows else []
            }
            
        except Exception as e:
            logger.error(f"Error processing CSV data: {str(e)}")
            raise

    async def _process_excel_data(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Process Excel file data"""
        try:
            # Read Excel file
            excel_file = pd.ExcelFile(io.BytesIO(file_content))
            
            sheets_data = {}
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                
                # Convert to dict format
                sheets_data[sheet_name] = {
                    "columns": df.columns.tolist(),
                    "rows": df.to_dict('records'),
                    "row_count": len(df),
                    "column_count": len(df.columns),
                    "sample_data": df.head().to_dict('records')
                }
            
            return {
                "filename": filename,
                "format": "excel",
                "sheets": sheets_data,
                "sheet_count": len(sheets_data)
            }
            
        except Exception as e:
            logger.error(f"Error processing Excel data: {str(e)}")
            raise

    async def _process_json_data(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Process JSON file data"""
        try:
            # Decode and parse JSON
            content_str = file_content.decode('utf-8')
            json_data = json.loads(content_str)
            
            return {
                "filename": filename,
                "format": "json",
                "data": json_data,
                "data_type": type(json_data).__name__,
                "structure_analysis": self._analyze_json_structure(json_data)
            }
            
        except Exception as e:
            logger.error(f"Error processing JSON data: {str(e)}")
            raise

    async def _process_text_data(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """Process text file data"""
        try:
            # Decode content
            content_str = file_content.decode('utf-8')
            
            # Basic text analysis
            lines = content_str.split('\n')
            words = content_str.split()
            
            return {
                "filename": filename,
                "format": "text",
                "content": content_str,
                "line_count": len(lines),
                "word_count": len(words),
                "character_count": len(content_str),
                "sample_lines": lines[:10]
            }
            
        except Exception as e:
            logger.error(f"Error processing text data: {str(e)}")
            raise

    async def _process_api_response(self, raw_data: Any, content_type: str, api_url: str) -> Dict[str, Any]:
        """Process API response data"""
        try:
            if isinstance(raw_data, dict):
                return {
                    "api_url": api_url,
                    "content_type": content_type,
                    "data": raw_data,
                    "structure_analysis": self._analyze_json_structure(raw_data)
                }
            elif isinstance(raw_data, list):
                return {
                    "api_url": api_url,
                    "content_type": content_type,
                    "data": raw_data,
                    "record_count": len(raw_data),
                    "sample_records": raw_data[:5] if raw_data else []
                }
            else:
                return {
                    "api_url": api_url,
                    "content_type": content_type,
                    "data": str(raw_data),
                    "data_type": type(raw_data).__name__
                }
                
        except Exception as e:
            logger.error(f"Error processing API response: {str(e)}")
            raise

    def _detect_file_format(self, filename: str, content_type: str) -> DataFormat:
        """Detect file format from filename and content type"""
        filename_lower = filename.lower()
        
        if filename_lower.endswith('.csv'):
            return DataFormat.CSV
        elif filename_lower.endswith(('.xlsx', '.xls')):
            return DataFormat.EXCEL
        elif filename_lower.endswith('.json'):
            return DataFormat.JSON
        elif filename_lower.endswith('.pdf'):
            return DataFormat.PDF
        elif filename_lower.endswith(('.png', '.jpg', '.jpeg')):
            return DataFormat.IMAGE
        elif filename_lower.endswith(('.txt', '.md')):
            return DataFormat.TEXT
        elif 'json' in content_type:
            return DataFormat.JSON
        elif 'csv' in content_type:
            return DataFormat.CSV
        elif 'excel' in content_type or 'spreadsheet' in content_type:
            return DataFormat.EXCEL
        else:
            return DataFormat.TEXT

    def _analyze_json_structure(self, data: Any, max_depth: int = 3) -> Dict[str, Any]:
        """Analyze JSON data structure"""
        def analyze_recursive(obj, depth=0):
            if depth > max_depth:
                return {"type": "max_depth_reached"}
            
            if isinstance(obj, dict):
                return {
                    "type": "object",
                    "keys": list(obj.keys())[:10],  # Limit to first 10 keys
                    "key_count": len(obj),
                    "sample_values": {k: analyze_recursive(v, depth + 1) for k, v in list(obj.items())[:3]}
                }
            elif isinstance(obj, list):
                return {
                    "type": "array",
                    "length": len(obj),
                    "sample_items": [analyze_recursive(item, depth + 1) for item in obj[:3]]
                }
            else:
                return {
                    "type": type(obj).__name__,
                    "value": str(obj)[:100] if len(str(obj)) > 100 else str(obj)
                }
        
        return analyze_recursive(data)

    def _count_json_records(self, data: Dict[str, Any]) -> int:
        """Count records in JSON data"""
        json_data = data.get("data")
        if isinstance(json_data, list):
            return len(json_data)
        elif isinstance(json_data, dict):
            return 1
        else:
            return 0

    def _count_api_records(self, data: Dict[str, Any]) -> int:
        """Count records in API response data"""
        api_data = data.get("data")
        if isinstance(api_data, list):
            return len(api_data)
        elif isinstance(api_data, dict):
            return data.get("record_count", 1)
        else:
            return 0

    def _assess_data_quality(self, data: Dict[str, Any]) -> float:
        """Assess data quality score"""
        try:
            quality_score = 0.0
            factors = 0
            
            # Completeness check
            if data:
                quality_score += 0.3
                factors += 1
            
            # Structure check
            if isinstance(data, dict) and len(data) > 1:
                quality_score += 0.2
                factors += 1
            
            # Content check
            if "rows" in data and data["rows"]:
                quality_score += 0.3
                factors += 1
            elif "data" in data and data["data"]:
                quality_score += 0.3
                factors += 1
            
            # Format check
            if data.get("format") in ["csv", "excel", "json"]:
                quality_score += 0.2
                factors += 1
            
            return quality_score if factors == 0 else quality_score / factors * factors
            
        except Exception:
            return 0.5  # Default score

    def _is_cache_valid(self, cached_result: IntegrationResult, data_source: DataSource) -> bool:
        """Check if cached result is still valid"""
        if not data_source.refresh_interval:
            return True  # No refresh interval means cache is always valid
        
        cache_age = (datetime.utcnow() - cached_result.timestamp).total_seconds() / 60
        return cache_age < data_source.refresh_interval

    async def _merge_integration_results(self,
                                       results: List[IntegrationResult],
                                       strategy: str) -> Optional[Dict[str, Any]]:
        """Merge multiple integration results"""
        if not results:
            return None
        
        try:
            if strategy == "union":
                # Combine all data
                merged_data = {
                    "merge_strategy": "union",
                    "source_count": len(results),
                    "sources": []
                }
                
                for result in results:
                    merged_data["sources"].append({
                        "source_id": result.source_id,
                        "data": result.processed_data,
                        "record_count": result.record_count,
                        "quality_score": result.data_quality_score
                    })
                
                return merged_data
                
            elif strategy == "intersection":
                # Find common data elements (simplified implementation)
                return {
                    "merge_strategy": "intersection",
                    "message": "Intersection merge not yet implemented"
                }
                
            else:
                return {
                    "merge_strategy": strategy,
                    "message": f"Merge strategy '{strategy}' not supported"
                }
                
        except Exception as e:
            logger.error(f"Error merging integration results: {str(e)}")
            return None

    async def _store_integration_result(self,
                                       result: IntegrationResult,
                                       user_id: str,
                                       session_id: Optional[str] = None) -> None:
        """Store integration result in database"""
        try:
            database = get_database()
            if not database:
                return
            
            result_doc = {
                "source_id": result.source_id,
                "status": result.status.value,
                "data": result.data,
                "processed_data": result.processed_data,
                "error_message": result.error_message,
                "processing_time": result.processing_time,
                "record_count": result.record_count,
                "data_quality_score": result.data_quality_score,
                "timestamp": result.timestamp,
                "metadata": result.metadata,
                "user_id": user_id,
                "session_id": session_id,
                "created_at": datetime.utcnow()
            }
            
            await database.integration_results.insert_one(result_doc)
            
        except Exception as e:
            logger.error(f"Error storing integration result: {str(e)}")


# Global service instance
data_integration_service = DataIntegrationService()


# Utility functions for easy access
async def integrate_file_upload(file_content: bytes,
                               filename: str,
                               content_type: str,
                               user_id: str,
                               session_id: Optional[str] = None) -> IntegrationResult:
    """Utility function to integrate uploaded file"""
    return await data_integration_service.process_file_upload(
        file_content, filename, content_type, user_id, session_id
    )


async def integrate_api_endpoint(api_url: str,
                               user_id: str,
                               session_id: Optional[str] = None,
                               headers: Optional[Dict[str, str]] = None,
                               auth_token: Optional[str] = None) -> IntegrationResult:
    """Utility function to integrate API endpoint"""
    return await data_integration_service.integrate_api_data(
        api_url, headers=headers, auth_token=auth_token
    )


async def register_data_source(name: str,
                             source_type: str,
                             format: str,
                             **kwargs) -> str:
    """Utility function to register data source"""
    return await data_integration_service.register_data_source(
        name=name,
        source_type=DataSourceType(source_type),
        format=DataFormat(format),
        **kwargs
    )