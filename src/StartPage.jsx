import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './StartPage.css';
import AnimatedSprite from './AnimatedSprite';
import { start_viking, viking_run, viking_jump, skeleton } from './vikingSprites';

function StartPage() {
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [vikingReachedBottom, setVikingReachedBottom] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [vikingPosition, setVikingPosition] = useState({ top: -100, left: 0 });
  const [skeletons, setSkeletons] = useState([]);
  const [telegramUserId, setTelegramUserId] = useState(null);
  const vikingRef = useRef(null);
  const floorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const skeletonAnimationRef = useRef(null);
  const skeletonSpawnIntervalRef = useRef(null);
  const velocityRef = useRef(0);
  const jumpTimeoutRef = useRef(null);
  const vikingPositionRef = useRef(vikingPosition);
  const isJumpingRef = useRef(isJumping);
  const gravity = 0.8;
  
  // Keep refs in sync with state
  useEffect(() => {
    vikingPositionRef.current = vikingPosition;
  }, [vikingPosition]);
  
  useEffect(() => {
    isJumpingRef.current = isJumping;
  }, [isJumping]);

  // Get Telegram User ID from WebApp API
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      console.warn("Telegram WebApp API is unavailable in this environment");
      return;
    }

    tg.ready();

    const telegramUserId = tg.initDataUnsafe?.user?.id;
    if (telegramUserId) {
      setTelegramUserId(String(telegramUserId));
    } else {
      console.warn("User ID not found in Telegram WebApp data");
    }
  }, []);
  
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
    if (gameStarted && !vikingReachedBottom && !gameOver) {
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
          
          if (!vikingReachedBottom && !gameOver) {
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
      if (jumpTimeoutRef.current) {
        clearTimeout(jumpTimeoutRef.current);
      }
    };
  }, [gameStarted, vikingReachedBottom, gameOver]);

  // Helper function to check collision
  const checkCollision = (vikingPos, skeletonList, jumping) => {
    // Use smaller collision boxes (60% of sprite size) for more forgiving gameplay
    const spriteSize = 75;
    const collisionSize = 45; // 60% of 75px
    const collisionPadding = (spriteSize - collisionSize) / 2; // 15px padding on each side
    
    const vikingLeft = vikingPos.left + collisionPadding;
    const vikingTop = vikingPos.top + collisionPadding;
    const vikingWidth = collisionSize;
    const vikingHeight = collisionSize;
    
    // Account for jump animation offset (3x skeleton height = 225px)
    const jumpOffset = jumping ? -225 : 0;
    const vikingActualTop = vikingTop + jumpOffset;
    
    return skeletonList.some(skeleton => {
      const skeletonLeft = skeleton.left + collisionPadding;
      const skeletonTop = skeleton.top + collisionPadding;
      const skeletonWidth = collisionSize;
      const skeletonHeight = collisionSize;
      
      // Check if rectangles overlap
      return (
        vikingLeft < skeletonLeft + skeletonWidth &&
        vikingLeft + vikingWidth > skeletonLeft &&
        vikingActualTop < skeletonTop + skeletonHeight &&
        vikingActualTop + vikingHeight > skeletonTop
      );
    });
  };

  // Skeleton spawning and animation
  useEffect(() => {
    if (gameStarted && vikingReachedBottom && !gameOver) {
      // Randomly spawn skeletons in groups of 1-3
      const spawnSkeleton = () => {
        const viewportHeight = window.innerHeight;
        const floorHeight = getFloorHeight();
        const floorTop = viewportHeight - floorHeight;
        const skeletonHeight = 75; // Same as viking
        const skeletonTop = floorTop - skeletonHeight;
        
        // Randomly determine how many skeletons to spawn (1-3)
        const skeletonCount = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        const skeletonSpacing = 80; // Space between skeletons
        const baseSpeed = 2 + Math.random() * 2; // Random speed between 2-4 (same for group)
        
        const newSkeletons = [];
        const baseLeft = window.innerWidth + 50; // Start off-screen right
        
        for (let i = 0; i < skeletonCount; i++) {
          newSkeletons.push({
            id: Date.now() + Math.random() + i, // Unique ID for each skeleton
            left: baseLeft + (i * skeletonSpacing), // Stagger horizontally
            top: skeletonTop,
            speed: baseSpeed // Same speed for all skeletons in the group
          });
        }
        
        setSkeletons(prev => [...prev, ...newSkeletons]);
      };

      // Spawn skeletons randomly every 2-5 seconds
      const scheduleNextSpawn = () => {
        const delay = 2000 + Math.random() * 3000; // 2-5 seconds
        skeletonSpawnIntervalRef.current = setTimeout(() => {
          if (!gameOver) {
            spawnSkeleton();
            scheduleNextSpawn();
          }
        }, delay);
      };

      // Initial spawn after a delay
      scheduleNextSpawn();

      // Animate skeletons moving left and check collisions
      const animateSkeletons = () => {
        if (gameOver) return;
        
        setSkeletons(prev => {
          const updatedSkeletons = prev
            .map(skeleton => ({
              ...skeleton,
              left: skeleton.left - skeleton.speed
            }))
            .filter(skeleton => skeleton.left > -100); // Remove when off-screen left
          
          // Check collision after updating skeleton positions using refs for current values
          if (!gameOver && checkCollision(vikingPositionRef.current, updatedSkeletons, isJumpingRef.current)) {
            setGameOver(true);
            // Cancel all animations
            if (skeletonSpawnIntervalRef.current) {
              clearTimeout(skeletonSpawnIntervalRef.current);
            }
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }
            return updatedSkeletons;
          }
          
          return updatedSkeletons;
        });
        
        if (!gameOver) {
          skeletonAnimationRef.current = requestAnimationFrame(animateSkeletons);
        }
      };
      
      skeletonAnimationRef.current = requestAnimationFrame(animateSkeletons);
    } else {
      // Clear skeletons when game stops
      setSkeletons([]);
    }

    return () => {
      if (skeletonAnimationRef.current) {
        cancelAnimationFrame(skeletonAnimationRef.current);
      }
      if (skeletonSpawnIntervalRef.current) {
        clearTimeout(skeletonSpawnIntervalRef.current);
      }
    };
  }, [gameStarted, vikingReachedBottom, gameOver]);

  const handleStartGame = (e) => {
    e.stopPropagation();
    setGameStarted(true);
    setGameOver(false);
    setVikingReachedBottom(false);
    setIsJumping(false);
    setVikingPosition({ top: -100, left: 0 });
    setSkeletons([]);
    velocityRef.current = 0;
  };

  const handleRestart = (e) => {
    e.stopPropagation();
    setGameStarted(true);
    setGameOver(false);
    setVikingReachedBottom(false);
    setIsJumping(false);
    setVikingPosition({ top: -100, left: 0 });
    setSkeletons([]);
    velocityRef.current = 0;
    
    // Clear all timeouts and animation frames
    if (skeletonAnimationRef.current) {
      cancelAnimationFrame(skeletonAnimationRef.current);
    }
    if (skeletonSpawnIntervalRef.current) {
      clearTimeout(skeletonSpawnIntervalRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (jumpTimeoutRef.current) {
      clearTimeout(jumpTimeoutRef.current);
    }
  };

  const handleRecords = (e) => {
    e.stopPropagation();
    navigate('/records');
  };

  const handlePageClick = () => {
    if (gameStarted && vikingReachedBottom && !gameOver) {
      // Clear any existing timeout to allow immediate re-triggering
      if (jumpTimeoutRef.current) {
        clearTimeout(jumpTimeoutRef.current);
      }
      
      // Force animation restart by manipulating the DOM directly
      if (vikingRef.current) {
        const element = vikingRef.current;
        element.classList.remove('viking-jumping');
        // Force reflow to ensure class removal is processed
        void element.offsetWidth;
        element.classList.add('viking-jumping');
      }
      
      setIsJumping(true);
      
      jumpTimeoutRef.current = setTimeout(() => {
        setIsJumping(false);
        if (vikingRef.current) {
          vikingRef.current.classList.remove('viking-jumping');
        }
        jumpTimeoutRef.current = null;
      }, 800);
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
          {skeletons.map(skeletonObj => (
            <div
              key={skeletonObj.id}
              className="skeleton-container"
              style={{
                top: `${skeletonObj.top}px`,
                left: `${skeletonObj.left}px`
              }}
            >
              <AnimatedSprite
                images={skeleton}
                frameDuration={200}
                alt="Skeleton"
                width="75px"
                height="75px"
              />
            </div>
          ))}
          <div ref={floorRef} className="pixel-floor"></div>
          {gameOver && (
            <div className="game-over-overlay">
              <h2 className="game-over-text">GAME OVER</h2>
              <button className="restart-button" onClick={handleRestart}>
                Restart
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StartPage;