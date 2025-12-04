import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './StartPage.css';
import AnimatedSprite from './AnimatedSprite';
import { start_viking, viking_run, viking_jump } from './vikingSprites';

function StartPage() {
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [vikingReachedBottom, setVikingReachedBottom] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [vikingPosition, setVikingPosition] = useState({ top: -100, left: 0 });
  const vikingRef = useRef(null);
  const floorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const velocityRef = useRef(0);
  const gravity = 0.8;
  
  // Get floor height based on screen size (responsive)
  const getFloorHeight = () => {
    const width = window.innerWidth;
    if (width >= 1440) return 140;
    if (width >= 769 && width <= 1024) return 100;
    if (width <= 480) return 80;
    if (window.innerHeight <= 500) return 70;
    return 120; // Default for desktop
  };

  useEffect(() => {
    if (gameStarted && !vikingReachedBottom) {
      // Start falling animation
      const startFalling = () => {
        const animate = () => {
          setVikingPosition(prev => {
            const newTop = prev.top + velocityRef.current;
            velocityRef.current += gravity;
            
            // Calculate floor position (bottom of viewport - floor height)
            const viewportHeight = window.innerHeight;
            const floorHeight = getFloorHeight();
            const floorTop = viewportHeight - floorHeight;
            
            // Collision detection: stop when viking reaches floor
            if (newTop + 75 >= floorTop) {
              const finalTop = floorTop - 75;
              setVikingReachedBottom(true);
              velocityRef.current = 0;
              return { top: finalTop, left: 0 };
            }
            
            return { ...prev, top: newTop };
          });
          
          if (!vikingReachedBottom) {
            animationFrameRef.current = requestAnimationFrame(animate);
          }
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      startFalling();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, vikingReachedBottom]);

  const handleStartGame = (e) => {
    e.stopPropagation();
    setGameStarted(true);
    setVikingPosition({ top: -100, left: 0 });
    velocityRef.current = 0;
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
          <div 
            ref={vikingRef}
            className={`viking-animation-container ${vikingReachedBottom ? 'viking-running' : 'viking-falling'} ${isJumping ? 'viking-jumping' : ''}`}
            style={{
              top: `${vikingPosition.top}px`,
              left: `${vikingPosition.left}px`
            }}
          >
            {!vikingReachedBottom ? (
              <AnimatedSprite
                images={start_viking}
                frameDuration={200}
                alt="Viking falling"
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
          <div ref={floorRef} className="pixel-floor"></div>
        </>
      )}
    </div>
  );
}

export default StartPage;