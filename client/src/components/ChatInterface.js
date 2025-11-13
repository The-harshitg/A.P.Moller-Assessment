import React, { useState, useRef, useEffect } from 'react';
import { Send, Database, User } from 'lucide-react';
import './ChatInterface.css';

function ChatInterface({ messages, onSendMessage, isLoading }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
      inputRef.current?.focus();
    }
  };

  const exampleQueries = [
    "Which product category was the highest selling in the past 2 quarters?",
    "What is the average order value for Electronics?",
    "Show me sales trends by month",
    "Compare revenue by customer state"
  ];

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>💬 Chat with Your Data</h2>
        <p>Ask questions in natural language</p>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.type}`}>
            <div className="message-avatar">
              {message.type === 'user' ? (
                <User size={20} />
              ) : (
                <Database size={20} />
              )}
            </div>
            <div className="message-content">
              <div className="message-text">
                {message.content.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < message.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              {message.sql && (
                <details className="sql-details">
                  <summary>View SQL Query</summary>
                  <pre className="sql-code">{message.sql}</pre>
                </details>
              )}
              {message.results && message.results.length > 0 && (
                <details className="results-details">
                  <summary>View Raw Data ({message.results.length} rows)</summary>
                  <div className="results-table">
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(message.results[0]).map((key) => (
                            <th key={key}>{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {message.results.slice(0, 10).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((value, j) => (
                              <td key={j}>{String(value)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {message.results.length > 10 && (
                      <p className="results-more">
                        ... and {message.results.length - 10} more rows
                      </p>
                    )}
                  </div>
                </details>
              )}
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <div className="message-avatar">
              <Database size={20} />
            </div>
            <div className="message-content">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="example-queries">
          <p>Try asking:</p>
          <div className="query-chips">
            {exampleQueries.map((query, index) => (
              <button
                key={index}
                className="query-chip"
                onClick={() => onSendMessage(query)}
                disabled={isLoading}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your e-commerce data..."
          disabled={isLoading}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="send-button"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}

export default ChatInterface;

