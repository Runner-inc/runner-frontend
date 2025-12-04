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
      
      setRecords(recordsArray);
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
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th>Score</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{record.username || record.user || record.name || 'Anonymous'}</td>
                      <td>{record.result !== undefined ? record.result : (record.score !== undefined ? record.score : 'N/A')}</td>
                      <td>{record.created_at ? new Date(record.created_at).toLocaleDateString() : (record.date ? new Date(record.date).toLocaleDateString() : 'N/A')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

