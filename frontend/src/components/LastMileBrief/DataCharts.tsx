import React, { useRef, useEffect } from 'react';

export interface ChartDefinition {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'treemap';
  title: string;
  data: ChartData;
  config: ChartConfig;
  insights: ChartInsight[];
}

export interface ChartData {
  labels?: string[];
  datasets?: Dataset[];
  values?: number[];
  categories?: string[];
  [key: string]: any;
}

export interface Dataset {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  [key: string]: any;
}

export interface ChartConfig {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  width?: number;
  height?: number;
  theme?: string;
  [key: string]: any;
}

export interface ChartInsight {
  id: string;
  type: string;
  description: string;
  confidence: number;
}

export interface ChartTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  gridColor?: string;
  accentColors?: string[];
}

export interface ChartInteraction {
  type: 'click' | 'hover' | 'select';
  data: any;
}

export interface DataChartsProps {
  charts: ChartDefinition[];
  theme: ChartTheme;
  onChartInteraction?: (chartId: string, interaction: ChartInteraction) => void;
}

const DataCharts: React.FC<DataChartsProps> = ({
  charts,
  theme,
  onChartInteraction
}) => {
  const chartRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  // Default color palette based on luxury theme
  const getColorPalette = () => [
    theme.primaryColor,
    '#EAE0D5',
    '#10B981',
    '#3B82F6',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4'
  ];

  const renderBarChart = (chart: ChartDefinition, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !chart.data.datasets) return;

    const { width, height } = canvas;
    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set styles
    ctx.fillStyle = theme.textColor;
    ctx.font = '12px Inter, sans-serif';

    const dataset = chart.data.datasets[0];
    const labels = chart.data.labels || [];
    const data = dataset.data;
    const maxValue = Math.max(...data);

    // Draw bars
    const barWidth = chartWidth / data.length * 0.8;
    const barSpacing = chartWidth / data.length * 0.2;

    data.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = padding + index * (barWidth + barSpacing);
      const y = height - padding - barHeight;

      // Bar
      ctx.fillStyle = Array.isArray(dataset.backgroundColor) 
        ? dataset.backgroundColor[index] || theme.primaryColor
        : dataset.backgroundColor || theme.primaryColor;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Value label
      ctx.fillStyle = theme.textColor;
      ctx.textAlign = 'center';
      ctx.fillText(value.toString(), x + barWidth / 2, y - 5);

      // X-axis label
      if (labels[index]) {
        ctx.save();
        ctx.translate(x + barWidth / 2, height - padding + 20);
        ctx.rotate(-Math.PI / 4);
        ctx.textAlign = 'right';
        ctx.fillText(labels[index], 0, 0);
        ctx.restore();
      }
    });

    // Draw axes
    ctx.strokeStyle = theme.gridColor || theme.textColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Y-axis
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    // X-axis
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Title
    ctx.fillStyle = theme.textColor;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(chart.title, width / 2, 30);
  };

  const renderPieChart = (chart: ChartDefinition, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !chart.data.datasets) return;

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const dataset = chart.data.datasets[0];
    const data = dataset.data;
    const labels = chart.data.labels || [];
    const total = data.reduce((sum, value) => sum + value, 0);
    const colors = getColorPalette();

    let currentAngle = -Math.PI / 2; // Start from top

    // Draw pie slices
    data.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      
      ctx.fillStyle = Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor[index] || colors[index % colors.length]
        : colors[index % colors.length];
      ctx.fill();
      
      ctx.strokeStyle = theme.backgroundColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw labels
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
      const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
      
      ctx.fillStyle = theme.textColor;
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      
      if (labels[index]) {
        ctx.fillText(labels[index], labelX, labelY);
        ctx.fillText(`${((value / total) * 100).toFixed(1)}%`, labelX, labelY + 15);
      }

      currentAngle += sliceAngle;
    });

    // Title
    ctx.fillStyle = theme.textColor;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(chart.title, width / 2, 30);
  };

  const renderLineChart = (chart: ChartDefinition, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !chart.data.datasets) return;

    const { width, height } = canvas;
    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const dataset = chart.data.datasets[0];
    const labels = chart.data.labels || [];
    const data = dataset.data;
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const valueRange = maxValue - minValue;

    // Draw grid lines
    ctx.strokeStyle = theme.gridColor || 'rgba(234, 224, 213, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= data.length - 1; i++) {
      const x = padding + (chartWidth / (data.length - 1)) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw line
    ctx.strokeStyle = Array.isArray(dataset.borderColor)
      ? dataset.borderColor[0] || theme.primaryColor
      : dataset.borderColor || theme.primaryColor;
    ctx.lineWidth = dataset.borderWidth || 3;
    ctx.beginPath();

    data.forEach((value, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index;
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Draw points
    ctx.fillStyle = Array.isArray(dataset.backgroundColor)
      ? dataset.backgroundColor[0] || theme.primaryColor
      : dataset.backgroundColor || theme.primaryColor;
    data.forEach((value, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index;
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw axes
    ctx.strokeStyle = theme.textColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Y-axis
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    // X-axis
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Labels
    ctx.fillStyle = theme.textColor;
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    labels.forEach((label, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index;
      ctx.fillText(label, x, height - padding + 20);
    });

    // Title
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(chart.title, width / 2, 30);
  };

  const renderChart = (chart: ChartDefinition) => {
    const canvas = chartRefs.current[chart.id];
    if (!canvas) return;

    // Set canvas size
    const config = chart.config;
    canvas.width = config.width || 400;
    canvas.height = config.height || 300;

    switch (chart.type) {
      case 'bar':
        renderBarChart(chart, canvas);
        break;
      case 'pie':
        renderPieChart(chart, canvas);
        break;
      case 'line':
        renderLineChart(chart, canvas);
        break;
      default:
        // Fallback for unsupported chart types
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = theme.textColor;
          ctx.font = '16px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${chart.type} chart`, canvas.width / 2, canvas.height / 2);
          ctx.fillText('(Not implemented)', canvas.width / 2, canvas.height / 2 + 25);
        }
    }
  };

  useEffect(() => {
    charts.forEach(chart => {
      renderChart(chart);
    });
  }, [charts, theme]);

  const handleCanvasClick = (chartId: string, event: React.MouseEvent<HTMLCanvasElement>) => {
    if (onChartInteraction) {
      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      onChartInteraction(chartId, {
        type: 'click',
        data: { x, y }
      });
    }
  };

  // Add safety checks for charts array
  const safeCharts = charts && Array.isArray(charts) ? charts : [];
  
  console.log('📊 [DataCharts] Rendering charts:', {
    chartsCount: safeCharts.length,
    chartsType: typeof charts,
    chartsIsArray: Array.isArray(charts)
  });

  return (
    <div className="data-charts">
      {safeCharts.map(chart => (
        <div key={chart.id} className="chart-container">
          <canvas
            ref={el => chartRefs.current[chart.id] = el}
            className="chart-canvas"
            onClick={(e) => handleCanvasClick(chart.id, e)}
            style={{ cursor: onChartInteraction ? 'pointer' : 'default' }}
          />
          
          {/* Chart insights */}
          {chart.insights && Array.isArray(chart.insights) && chart.insights.length > 0 && (
            <div className="chart-insights">
              <h4>Key Insights</h4>
              <ul>
                {chart.insights.map(insight => (
                  <li key={insight.id} className="chart-insight">
                    <span className="insight-text">{insight.description}</span>
                    <span className="insight-confidence">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DataCharts;