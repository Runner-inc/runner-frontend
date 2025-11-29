import React, { useState } from 'react';
import './StartPage.css';
import AnimatedSprite from './AnimatedSprite';
import { start_viking, viking_run, viking_jump } from './vikingSprites';

function StartPage() {
  const [gameStarted, setGameStarted] = useState(false);
  const [vikingReachedBottom, setVikingReachedBottom] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  const handleStartGame = (e) => {
    e.stopPropagation();
    setGameStarted(true);
    // After 2 seconds (animation duration), switch to running animation
    setTimeout(() => {
      setVikingReachedBottom(true);
    }, 2000);
  };

  const handleRecords = (e) => {
    e.stopPropagation();
    // TODO: Navigate to records
    console.log('Records clicked');
  };

  const handlePageClick = (e) => {
    // Only allow jumping if game has started and viking has reached bottom
    if (gameStarted && vikingReachedBottom && !isJumping) {
      setIsJumping(true);
      // Jump animation duration is about 0.6 seconds
      setTimeout(() => {
        setIsJumping(false);
      }, 600);
    }
  };

  const handlePageTouch = (e) => {
    e.preventDefault();
    handlePageClick(e);
  };


  return (
    <div 
      className={`start-page ${gameStarted && vikingReachedBottom ? 'game-active' : ''}`} 
      onClick={handlePageClick}
      onTouchStart={handlePageTouch}
    >
      <div className="background-scroll">
        <div className="background-layer"></div>
      </div>
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
          <div className={`viking-animation-container ${vikingReachedBottom ? 'viking-running' : ''} ${isJumping ? 'viking-jumping' : ''}`}>
            {!vikingReachedBottom ? (
              <AnimatedSprite
                images={start_viking}
                frameDuration={200}
                alt="Viking start animation"
                width="75px"
                height="75px"
                className="viking-start-animation"
              />
            ) : (
              <AnimatedSprite
                images={isJumping ? viking_jump : viking_run}
                frameDuration={isJumping ? 120 : 150}
                alt={isJumping ? "Viking jumping" : "Viking running"}
                width="75px"
                height="75px"
                className="viking-start-animation"
              />
            )}
          </div>
          <div className="pixel-floor"></div>
        </>
      )}
    </div>
  );
}

export default StartPage;

