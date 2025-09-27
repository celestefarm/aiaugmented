import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, Table, BarChart3, FileText, MapPin, Clock, Languages, Zap } from 'lucide-react';

interface OCRRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
  content_type: string;
  region_reference?: string;
  relative_position?: {
    x_percent: number;
    y_percent: number;
  };
}

interface OCRTableCell {
  row: number;
  col: number;
  text: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface OCRTable {
  rows: number;
  cols: number;
  confidence: number;
  bbox: [number, number, number, number];
  cells: OCRTableCell[];
}

interface OCRChartElement {
  type: string;
  text: string;
  position: [number, number];
  confidence: number;
  metadata: Record<string, any>;
}

interface OCRMetadata {
  quality_assessment: string;
  language_detected: string;
  confidence_score: number;
  processing_time: number;
  regions_detected: number;
  tables_detected: number;
  chart_elements_detected: number;
}

interface OCRResultsDisplayProps {
  extractedText: string;
  ocrMetadata?: OCRMetadata;
  extractedData?: {
    regions?: OCRRegion[];
    tables?: OCRTable[];
    chart_elements?: OCRChartElement[];
    ocr_quality?: string;
    language_detected?: string;
    confidence_score?: number;
    processing_time?: number;
  };
  filename: string;
}

const OCRResultsDisplay: React.FC<OCRResultsDisplayProps> = ({
  extractedText,
  ocrMetadata,
  extractedData,
  filename
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'text' | 'regions' | 'tables' | 'charts'>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getQualityColor = (quality: string) => {
    switch (quality?.toLowerCase()) {
      case 'excellent': return 'text-green-400';
      case 'high': return 'text-blue-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatRegionReference = (region: OCRRegion) => {
    if (region.region_reference) {
      return region.region_reference.replace('-', ' ');
    }
    if (region.relative_position) {
      const { x_percent, y_percent } = region.relative_position;
      return `${x_percent}%, ${y_percent}%`;
    }
    return `${region.x}, ${region.y}`;
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-pane p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Quality</span>
          </div>
          <span className={`text-sm font-medium ${getQualityColor(ocrMetadata?.quality_assessment || extractedData?.ocr_quality || 'unknown')}`}>
            {(ocrMetadata?.quality_assessment || extractedData?.ocr_quality || 'Unknown').toUpperCase()}
          </span>
        </div>

        <div className="glass-pane p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Languages className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Language</span>
          </div>
          <span className="text-sm font-medium text-white">
            {ocrMetadata?.language_detected || extractedData?.language_detected || 'Unknown'}
          </span>
        </div>

        <div className="glass-pane p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Confidence</span>
          </div>
          <span className={`text-sm font-medium ${getConfidenceColor(ocrMetadata?.confidence_score || extractedData?.confidence_score || 0)}`}>
            {((ocrMetadata?.confidence_score || extractedData?.confidence_score || 0)).toFixed(1)}%
          </span>
        </div>

        <div className="glass-pane p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-400">Time</span>
          </div>
          <span className="text-sm font-medium text-white">
            {((ocrMetadata?.processing_time || extractedData?.processing_time || 0)).toFixed(2)}s
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass-pane p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Text Regions</span>
          </div>
          <span className="text-2xl font-bold text-blue-400">
            {ocrMetadata?.regions_detected || extractedData?.regions?.length || 0}
          </span>
          <p className="text-xs text-gray-400 mt-1">Spatial text areas detected</p>
        </div>

        <div className="glass-pane p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Table className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-white">Tables</span>
          </div>
          <span className="text-2xl font-bold text-green-400">
            {ocrMetadata?.tables_detected || extractedData?.tables?.length || 0}
          </span>
          <p className="text-xs text-gray-400 mt-1">Structured data tables found</p>
        </div>

        <div className="glass-pane p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">Chart Elements</span>
          </div>
          <span className="text-2xl font-bold text-purple-400">
            {ocrMetadata?.chart_elements_detected || extractedData?.chart_elements?.length || 0}
          </span>
          <p className="text-xs text-gray-400 mt-1">Graph/chart components</p>
        </div>
      </div>
    </div>
  );

  const renderTextContent = () => (
    <div className="space-y-4">
      <div className="glass-pane p-4 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Extracted Text Content
        </h4>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 max-h-96 overflow-y-auto">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
            {extractedText || 'No text content extracted from this image.'}
          </pre>
        </div>
      </div>
    </div>
  );

  const renderRegions = () => (
    <div className="space-y-4">
      {extractedData?.regions && extractedData.regions.length > 0 ? (
        <div className="space-y-3">
          {extractedData.regions.map((region, index) => (
            <div key={index} className="glass-pane p-4 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">
                    Region {index + 1}
                  </span>
                  <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                    {formatRegionReference(region)}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(region.confidence)} bg-gray-800/50`}>
                  {region.confidence.toFixed(1)}%
                </span>
              </div>
              <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                <p className="text-sm text-gray-300">{region.text}</p>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>Position: {region.x}, {region.y}</span>
                <span>Size: {region.width}×{region.height}</span>
                <span>Type: {region.content_type}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-pane p-8 rounded-lg text-center">
          <MapPin className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">No text regions detected in this image.</p>
        </div>
      )}
    </div>
  );

  const renderTables = () => (
    <div className="space-y-4">
      {extractedData?.tables && extractedData.tables.length > 0 ? (
        <div className="space-y-4">
          {extractedData.tables.map((table, index) => (
            <div key={index} className="glass-pane p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-white">
                    Table {index + 1}
                  </span>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded">
                    {table.rows}×{table.cols}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(table.confidence)} bg-gray-800/50`}>
                  {table.confidence.toFixed(1)}%
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {Array.from({ length: table.rows }, (_, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-gray-700/50">
                        {Array.from({ length: table.cols }, (_, colIndex) => {
                          const cell = table.cells.find(c => c.row === rowIndex && c.col === colIndex);
                          return (
                            <td key={colIndex} className="p-2 border-r border-gray-700/50 last:border-r-0">
                              <span className="text-gray-300">{cell?.text || ''}</span>
                              {cell && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {cell.confidence.toFixed(0)}%
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-pane p-8 rounded-lg text-center">
          <Table className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">No tables detected in this image.</p>
        </div>
      )}
    </div>
  );

  const renderCharts = () => (
    <div className="space-y-4">
      {extractedData?.chart_elements && extractedData.chart_elements.length > 0 ? (
        <div className="space-y-3">
          {extractedData.chart_elements.map((element, index) => (
            <div key={index} className="glass-pane p-4 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">
                    {element.type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(element.confidence)} bg-gray-800/50`}>
                  {element.confidence.toFixed(1)}%
                </span>
              </div>
              <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                <p className="text-sm text-gray-300">{element.text}</p>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span>Position: {element.position[0]}, {element.position[1]}</span>
                <span>Type: {element.type}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-pane p-8 rounded-lg text-center">
          <BarChart3 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400">No chart elements detected in this image.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-400" />
          OCR Analysis Results
        </h3>
        <span className="text-sm text-gray-400">{filename}</span>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-700/50 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'text', label: 'Text Content', icon: FileText },
          { id: 'regions', label: 'Regions', icon: MapPin, count: extractedData?.regions?.length },
          { id: 'tables', label: 'Tables', icon: Table, count: extractedData?.tables?.length },
          { id: 'charts', label: 'Charts', icon: BarChart3, count: extractedData?.chart_elements?.length }
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count !== undefined && count > 0 && (
              <span className="bg-gray-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'text' && renderTextContent()}
        {activeTab === 'regions' && renderRegions()}
        {activeTab === 'tables' && renderTables()}
        {activeTab === 'charts' && renderCharts()}
      </div>
    </div>
  );
};

export default OCRResultsDisplay;