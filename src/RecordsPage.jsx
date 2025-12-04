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
      const response = await fetch('https://runner-backend-8y6udc9sk-kanshandirs-projects.vercel.app/users.result');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setRecords(data);
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
                      <td>{record.username || record.user || 'Anonymous'}</td>
                      <td>{record.score || record.result || 'N/A'}</td>
                      <td>{record.date ? new Date(record.date).toLocaleDateString() : 'N/A'}</td>
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

