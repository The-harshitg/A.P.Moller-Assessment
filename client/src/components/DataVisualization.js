import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import './DataVisualization.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function DataVisualization({ data }) {
  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="visualization-empty">
        <p>No visualization data available</p>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Data Visualization',
        font: {
          size: 18,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: data.type !== 'pie' && data.type !== 'doughnut' ? {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    } : {}
  };

  const chartData = {
    labels: data.data.map(item => item.label),
    datasets: [
      {
        label: 'Value',
        data: data.data.map(item => item.value),
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)',
          'rgba(118, 75, 162, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderColor: [
          'rgba(102, 126, 234, 1)',
          'rgba(118, 75, 162, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(236, 72, 153, 1)',
        ],
        borderWidth: 2,
        borderRadius: data.type === 'bar' ? 8 : 0,
      }
    ]
  };

  const renderChart = () => {
    switch (data.type) {
      case 'bar':
        return <Bar data={chartData} options={chartOptions} />;
      case 'line':
        return <Line data={chartData} options={chartOptions} />;
      case 'pie':
        return <Pie data={chartData} options={chartOptions} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={chartOptions} />;
      case 'metric':
        return (
          <div className="metric-cards">
            {Object.entries(data.data).map(([key, value]) => (
              <div key={key} className="metric-card">
                <div className="metric-label">{key.replace(/_/g, ' ').toUpperCase()}</div>
                <div className="metric-value">{value}</div>
              </div>
            ))}
          </div>
        );
      default:
        return <Bar data={chartData} options={chartOptions} />;
    }
  };

  return (
    <div className="data-visualization">
      <div className="visualization-container">
        {renderChart()}
      </div>
    </div>
  );
}

export default DataVisualization;

