import React from 'react';
import './StartPage.css';

function StartPage() {
  const handleStartGame = () => {
    // TODO: Navigate to game
    console.log('Start Game clicked');
  };

  const handleRecords = () => {
    // TODO: Navigate to records
    console.log('Records clicked');
  };

  return (
    <div className="start-page">
      <h1 className="app-title">WalhallaRunner</h1>
      <div className="button-container">
        <button className="start-button" onClick={handleStartGame}>
          Start Game
        </button>
        <button className="records-button" onClick={handleRecords}>
          Records
        </button>
      </div>
    </div>
  );
}

export default StartPage;

