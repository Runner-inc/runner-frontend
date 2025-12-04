import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecordsPage.css';

function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('https://runner-backend-sandy.vercel.app/api/users/');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      // Handle different response structures
      // If response has a 'result' property, use it; otherwise use the data directly
      const recordsData = data.result || data.results || data;
      
      // Ensure it's an array
      let recordsArray = [];
      if (Array.isArray(recordsData)) {
        recordsArray = recordsData;
      } else if (recordsData && typeof recordsData === 'object') {
        // If it's an object, try to convert to array
        recordsArray = [recordsData];
      }
      
      // Sort by result/score in descending order (highest first)
      recordsArray.sort((a, b) => {
        const scoreA = a.result !== undefined ? a.result : (a.score !== undefined ? a.score : 0);
        const scoreB = b.result !== undefined ? b.result : (b.score !== undefined ? b.score : 0);
        return scoreB - scoreA;
      });
      
      // Take only the top score (first record after sorting)
      setRecords(recordsArray.length > 0 ? [recordsArray[0]] : []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="records-page">
      <div className="records-container">
        <h1 className="records-title">Records</h1>
        
        <button className="back-button" onClick={handleBack}>
          Back to Start
        </button>

        {loading && (
          <div className="loading-message">Loading records...</div>
        )}

        {error && (
          <div className="error-message">
            Error loading records: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="records-list">
            {records && records.length > 0 ? (
              <div className="top-score-card">
                <h2 className="top-score-title">Top Score</h2>
                <div className="score-details">
                  <div className="score-item">
                    <span className="score-label">User:</span>
                    <span className="score-value">{records[0].username || records[0].user || records[0].name || 'Anonymous'}</span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Score:</span>
                    <span className="score-value highlight">{records[0].result !== undefined ? records[0].result : (records[0].score !== undefined ? records[0].score : 'N/A')}</span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Date:</span>
                    <span className="score-value">{records[0].created_at ? new Date(records[0].created_at).toLocaleDateString() : (records[0].date ? new Date(records[0].date).toLocaleDateString() : 'N/A')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-records">No records found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecordsPage;

