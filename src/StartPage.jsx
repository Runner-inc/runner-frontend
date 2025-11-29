import React, { useState } from 'react';
import './StartPage.css';
import AnimatedSprite from './AnimatedSprite';
import { start_viking, viking_run } from './vikingSprites';

function StartPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [vikingReachedBottom, setVikingReachedBottom] = useState(false);

  const handleStartGame = () => {
    setGameStarted(true);
    // After 2 seconds (animation duration), switch to running animation
    setTimeout(() => {
      setVikingReachedBottom(true);
    }, 2000);
  };

  const handleRecords = () => {
    // TODO: Navigate to records
    console.log('Records clicked');
  };

  return (
    <div className="start-page">
      {!gameStarted ? (
        <>
          <h1 className="app-title">ValhallaRunner</h1>
          <div className="button-container">
            <button className="start-button" onClick={handleStartGame}>
              Start Game
            </button>
            <button className="records-button" onClick={handleRecords}>
              Records
            </button>
          </div>
        </>
      ) : (
        <>
          <div className={`viking-animation-container ${vikingReachedBottom ? 'viking-running' : ''}`}>
            <AnimatedSprite
              images={vikingReachedBottom ? viking_run : start_viking}
              frameDuration={vikingReachedBottom ? 150 : 200}
              alt={vikingReachedBottom ? "Viking running" : "Viking start animation"}
              width="150px"
              height="150px"
              className="viking-start-animation"
            />
          </div>
          <div className="pixel-floor"></div>
        </>
      )}
    </div>
  );
}

export default StartPage;

