import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { sendMessage } from '../services/api';
import '../App.css';

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading messages from localStorage:', error);
      }
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendMessage(userMessage.content);
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.explanation,
        sqlQuery: response.sqlQuery,
        results: response.results,
        resultCount: response.resultCount,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: error.message || 'An error occurred while processing your query.',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      localStorage.removeItem('chatMessages');
    }
  };

  const formatTableData = (results) => {
    if (!results || results.length === 0) {
      return <p className="no-results">No results found.</p>;
    }

    // Get all unique keys from all results
    const allKeys = [...new Set(results.flatMap(Object.keys))];

    return (
      <div className="table-container">
        <table className="results-table">
          <thead>
            <tr>
              {allKeys.map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.slice(0, 100).map((row, index) => (
              <tr key={index}>
                {allKeys.map((key) => (
                  <td key={key}>
                    {row[key] !== null && row[key] !== undefined
                      ? String(row[key])
                      : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {results.length > 100 && (
          <p className="results-limit">
            Showing first 100 of {results.length} results
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h1>Conversational Analytics</h1>
          <p>Ask questions about your BigQuery data in natural language</p>
        </div>
        {messages.length > 0 && (
          <button className="clear-button" onClick={handleClearChat}>
            Clear Chat
          </button>
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <p>👋 Welcome! Start by asking a question about your data.</p>
            <p className="example-queries">
              <strong>Example queries:</strong>
            </p>
            <ul>
              <li>"Show me the total sales by region"</li>
              <li>"What are the top 10 products by revenue?"</li>
              <li>"Count the number of records in the users table"</li>
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                {message.type === 'user' ? (
                  <div className="user-message">
                    <div className="message-text">{message.content}</div>
                  </div>
                ) : message.type === 'error' ? (
                  <div className="error-message">
                    <div className="message-text">{message.content}</div>
                  </div>
                ) : (
                  <div className="assistant-message">
                    <div className="markdown-content">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="message assistant loading">
            <div className="message-content">
              <div className="loading-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="input-form" onSubmit={handleSend}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question about your data..."
          disabled={isLoading}
          className="message-input"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="send-button"
          aria-label="Send message"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
          </svg>
        </button>
      </form>
    </div>
  );
}

export default ChatInterface;

