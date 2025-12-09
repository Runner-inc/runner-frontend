import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecordsPage.css';

function RecordsPage() {
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [telegramId, setTelegramId] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      setError('Telegram WebApp API is unavailable. Please open this app in Telegram.');
      setLoading(false);
      return;
    }

    tg.ready();

    const telegramUserId = tg.initDataUnsafe?.user?.id;

    if (telegramUserId) {
      setTelegramId(String(telegramUserId));
    } else {
      setError('User ID not found in Telegram WebApp data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!telegramId) return;

    const fetchRecord = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://runner-backend-sandy.vercel.app/api/users/${telegramId}`
        );

        if (!response.ok) {
          setError(response.status === 404
            ? 'No record found for this user'
            : 'Failed to fetch record');
          return;
        }

        const data = await response.json();
        setRecord(data);

      } catch (err) {
        console.error('Error fetching record:', err);
        setError('Error fetching record. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [telegramId]);

  const handleBack = () => {
    console.log('Back button clicked - navigating to /');
    navigate('/');
  };

  return (
    <div className="records-page">
      <div className="records-bg">
        <div className="records-bg-image"></div>
      </div>
      <h1 className="records-title">Records</h1>
      {loading ? (
        <div className="loading-container">
          <p className="loading-text">Loading...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p className="error-text">{error}</p>
          {!telegramId && (
            <p className="error-hint">Please open this app in Telegram to view your records.</p>
          )}
        </div>
      ) : record ? (
        <div className="record-container">
          <div className="record-card">
            <h2 className="record-label">Highest Score</h2>
            <div className="record-value">
              {record.result != null ? record.result.toLocaleString() : 'N/A'}
            </div>
            {record.username && (
              <div className="record-username">
                <span className="username-label">User:</span>
                <span className="username-value">{record.username}</span>
              </div>

            )}
          </div>
        </div>
      ) : (
        <div className="no-record-container">
          <p className="no-record-text">No record found</p>
        </div>
      )}

      <button
        className="back-button"
        onClick={handleBack}
        onTouchStart={(e) => {
          e.preventDefault();
          handleBack();
        }}
      >
        Back to Game
      </button>
    </div>
  );
}

export default RecordsPage;
