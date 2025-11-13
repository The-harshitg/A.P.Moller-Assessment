import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ChatInterface from './components/ChatInterface';
import DataVisualization from './components/DataVisualization';
import StatsPanel from './components/StatsPanel';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [stats, setStats] = useState(null);
  const [visualizationData, setVisualizationData] = useState(null);

  useEffect(() => {
    // Load initial stats
    loadStats();
    
    // Add welcome message
    setMessages([{
      type: 'ai',
      content: "👋 Welcome! I'm your AI assistant for e-commerce data insights. Ask me questions like:\n\n• Which product category was the highest selling in the past 2 quarters?\n• What is the average order value for Electronics?\n• Show me sales trends over time\n• Compare revenue by state\n\nI can also help with definitions, translations, and more!",
      timestamp: new Date()
    }]);
  }, []);

  // API base URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const loadStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/data/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSendMessage = async (message) => {
    const userMessage = {
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setVisualizationData(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        message,
        sessionId
      });

      if (response.data.success) {
        const aiMessage = {
          type: 'ai',
          content: response.data.response,
          sql: response.data.sql,
          results: response.data.results,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        
        if (response.data.visualizationData) {
          setVisualizationData(response.data.visualizationData);
        }
      } else {
        throw new Error(response.data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage = {
        type: 'ai',
        content: `Sorry, I encountered an error: ${error.response?.data?.message || error.message}. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🚢 Maersk AI/ML - E-commerce Insights</h1>
          <p>Powered by Gemini AI • Conversational Data Analytics</p>
        </div>
      </header>

      <div className="app-container">
        <div className="main-content">
          <div className="chat-section">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>

          <div className="visualization-section">
            {visualizationData && (
              <DataVisualization data={visualizationData} />
            )}
            {!visualizationData && stats && (
              <StatsPanel stats={stats} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

