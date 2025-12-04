import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StartPage.css';
import AnimatedSprite from './AnimatedSprite';
import { start_viking, viking_run, viking_jump } from './vikingSprites';

function StartPage() {
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [vikingReachedBottom, setVikingReachedBottom] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  const handleStartGame = (e) => {
    e.stopPropagation();
    setGameStarted(true);
    setTimeout(() => setVikingReachedBottom(true), 2000);
  };

  const handleRecords = (e) => {
    e.stopPropagation();
    navigate('/records');
  };

  const handlePageClick = () => {
    if (gameStarted && vikingReachedBottom && !isJumping) {
      setIsJumping(true);
      setTimeout(() => setIsJumping(false), 600);
    }
  };

  const handlePageTouch = (e) => {
    e.preventDefault();
    handlePageClick();
  };

  return (
    <div 
      className={`start-page ${gameStarted && vikingReachedBottom ? 'game-active' : ''}`} 
      onClick={handlePageClick}
      onTouchStart={handlePageTouch}
    >
      <div className="valhalla-background">
        <div className="sky-layer"></div>
        <div className="mountains-layer"></div>
        <div className="clouds-layer"></div>
      </div>

      {!gameStarted ? (
        <>
          <h1 className="app-title">ValhallaRunner</h1>
          <div className="button-container">
            <button className="start-button" onClick={handleStartGame}>Start Game</button>
            <button className="records-button" onClick={handleRecords}>Records</button>
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
              />
            ) : (
              <AnimatedSprite
                images={isJumping ? viking_jump : viking_run}
                frameDuration={isJumping ? 120 : 150}
                alt={isJumping ? "Viking jumping" : "Viking running"}
                width="75px"
                height="75px"
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