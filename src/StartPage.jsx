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

  const handlePageClick = () => {
    // Only allow jumping if game has started and viking has reached bottom
    if (gameStarted && vikingReachedBottom && !isJumping) {
      setIsJumping(true);
      // Jump animation duration is about 0.6 seconds
      setTimeout(() => {
        setIsJumping(false);
      }, 600);
    }
  };

  const getCurrentImages = () => {
    if (!vikingReachedBottom) return start_viking;
    if (isJumping) return viking_jump;
    return viking_run;
  };

  const getCurrentFrameDuration = () => {
    if (!vikingReachedBottom) return 200;
    if (isJumping) return 120;
    return 150;
  };

  return (
    <div className={`start-page ${gameStarted && vikingReachedBottom ? 'game-active' : ''}`} onClick={handlePageClick}>
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
            <AnimatedSprite
              images={getCurrentImages()}
              frameDuration={getCurrentFrameDuration()}
              alt={isJumping ? "Viking jumping" : vikingReachedBottom ? "Viking running" : "Viking start animation"}
              width="75px"
              height="75px"
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

