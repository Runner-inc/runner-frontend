import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './StartPage.css';
import AnimatedSprite from './AnimatedSprite';
import { start_viking, viking_run, viking_jump, skeleton, valkyrie } from './vikingSprites';

function StartPage() {
  const navigate = useNavigate();
  const [gameStarted, setGameStarted] = useState(false);
  const [vikingReachedBottom, setVikingReachedBottom] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [vikingPosition, setVikingPosition] = useState({ top: -100, left: 0 });
  const [skeletons, setSkeletons] = useState([]);
  const [valkyries, setValkyries] = useState([]);
  const enemiesOnScreenRef = useRef(0);
  const skeletonCountRef = useRef(0);
  const valkyrieCountRef = useRef(0);
  const [telegramUserId, setTelegramUserId] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [pointerPressure, setPointerPressure] = useState(0.5);
  const [pointerDownTime, setPointerDownTime] = useState(null);
  const [currentJumpHeight, setCurrentJumpHeight] = useState(225);
  const elapsedSecondsRef = useRef(0);

  const vikingRef = useRef(null);
  const animationFrameRef = useRef(null);
  const skeletonAnimationRef = useRef(null);
  const skeletonSpawnIntervalRef = useRef(null);
  const valkyrieAnimationRef = useRef(null);
  const valkyrieSpawnIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const scoreSubmittedRef = useRef(false);
  const velocityRef = useRef(0);
  const jumpTimeoutRef = useRef(null);
  const vikingPositionRef = useRef(vikingPosition);
  const isJumpingRef = useRef(isJumping);
  const gravity = 0.2;

  // Calculate spawn rate - gets faster every 5 seconds
  const getSpawnDelay = (baseMin, baseMax, elapsedSeconds) => {
    const intervals = Math.floor(elapsedSeconds / 5); // Every 5 seconds
    const speedIncrease = intervals * 100; // 30% faster each interval
    const minDelay = Math.max(baseMin * (1 - speedIncrease), 800); // Minimum 800ms (start slower)
    const maxDelay = Math.max(baseMax * (1 - speedIncrease), 1200); // Minimum 1200ms (start slower)
    return minDelay + Math.random() * (maxDelay - minDelay);
  };

  // Calculate enemy speed based on elapsed time - increases every 5 seconds
  const getEnemySpeed = (baseSpeed, elapsedSeconds) => {
    const intervals = Math.floor(elapsedSeconds / 5); // Every 5 seconds
    const speedMultiplier = 1 + intervals * 0.5; // 50% faster each interval for aggressive difficulty
    return baseSpeed * speedMultiplier;
  };

  // Calculate current difficulty multiplier for display
  const getDifficultyMultiplier = (elapsedSeconds) => {
    const intervals = Math.floor(elapsedSeconds / 10);
    return (1 + intervals * 100).toFixed(1);
  };

  useEffect(() => { vikingPositionRef.current = vikingPosition; }, [vikingPosition]);
  useEffect(() => { isJumpingRef.current = isJumping; }, [isJumping]);
  useEffect(() => { skeletonCountRef.current = skeletons.length; }, [skeletons]);
  useEffect(() => { valkyrieCountRef.current = valkyries.length; }, [valkyries]);
  useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      setError('Telegram WebApp API is unavailable. Please open this app in Telegram.');
      return;
    }
    tg.ready();
    const telegramUserId = tg.initDataUnsafe?.user?.id;
    if (telegramUserId) setTelegramUserId(String(telegramUserId));
    else setError('User ID not found in Telegram WebApp data');
  }, []);

  const getFloorHeight = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width >= 1440) return 270;
    if (width >= 769 && width <= 1024) return 195;
    if (height <= 500) return 135;
    if (width <= 480) return 158;
    if (width <= 768) return 173;
    return 600;
  };

  useEffect(() => {
    if (gameStarted && !vikingReachedBottom && !gameOver) {
      const animateFall = () => {
        setVikingPosition(prev => {
          const newTop = prev.top + velocityRef.current;
          velocityRef.current += gravity;
          const floorTop = window.innerHeight - getFloorHeight() + 50;
          if (newTop + 120 >= floorTop) {
            setVikingReachedBottom(true);
            velocityRef.current = 0;
            return { top: floorTop - 120, left: 0 };
          }
          return { ...prev, top: newTop };
        });
        if (!vikingReachedBottom && !gameOver) {
          animationFrameRef.current = requestAnimationFrame(animateFall);
        }
      };
      animationFrameRef.current = requestAnimationFrame(animateFall);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
    };
  }, [gameStarted, vikingReachedBottom, gameOver]);

  useEffect(() => {
    if (gameStarted && !gameOver && !timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    }
    if (!gameStarted || gameOver) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [gameStarted, gameOver]);

  const submitScore = async () => {
    if (!telegramUserId || scoreSubmittedRef.current) return;
    scoreSubmittedRef.current = true;

    try {
      // Получаем текущий рекорд
      const res = await fetch(`https://runner-backend-sandy.vercel.app/api/users/${telegramUserId}`);
      const data = await res.json();
      const currentBest = data?.result || 0;

      if (elapsedSeconds > currentBest) {
        await fetch(`https://runner-backend-sandy.vercel.app/api/users/${telegramUserId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ result: elapsedSeconds })
        });
        console.log(`New highscore submitted: ${elapsedSeconds}`);
      } else {
        console.log(`Score ${elapsedSeconds} not higher than current best ${currentBest}, not submitted.`);
      }
    } catch (err) {
      console.warn("Score submit failed:", err);
    }
  };

  const checkCollision = (vPos, skeletonList, valkyrieList, jumping) => {
    const spriteSize = 75;
    const collisionSize = 45;
    const padding = (spriteSize - collisionSize);

    // Get the actual viking position from DOM (including CSS transforms)
    let vTop, vLeft;
    if (vikingRef.current) {
      const rect = vikingRef.current.getBoundingClientRect();
      vTop = rect.top + padding;
      vLeft = rect.left + padding;
    } else {
      // Fallback to position-based calculation if ref not available
      vTop = vPos.top + padding + (jumping ? -190 : 0);
      vLeft = vPos.left + padding;
    }

    const vRight = vLeft + collisionSize;
    const vBottom = vTop + collisionSize;

    // Debug: Show collision boxes (remove in production)


    // Check skeleton collisions
    const skeletonCollision = skeletonList.some(skel => {
      const sTop = skel.top + padding;
      const sLeft = skel.left + padding;
      const sRight = sLeft + collisionSize;
      const sBottom = sTop + collisionSize;

      const collision = (
        vLeft < sRight &&    // Viking left < Skeleton right
        vRight > sLeft &&    // Viking right > Skeleton left
        vTop < sBottom &&    // Viking top < Skeleton bottom
        vBottom > sTop       // Viking bottom > Skeleton top
      );

      if (collision) {
      }

      return collision;
    });

    // Check valkyrie collisions
    const valkyrieCollision = valkyrieList.some(valk => {
      const valkTop = valk.top + padding;
      const valkLeft = valk.left + padding;
      const valkRight = valkLeft + collisionSize;
      const valkBottom = valkTop + collisionSize;

      const collision = (
        vLeft < valkRight &&    // Viking left < Skeleton right
        vRight > valkLeft &&    // Viking right > Skeleton left
        vTop < valkBottom &&    // Viking top < Skeleton bottom
        vBottom > valkTop       // Viking bottom > Skeleton top
      );
      // const collision = (
      //   vRight < sLeft &&
      //   vLeft > sRight &&
      //   vBottom < sTop &&
      //   vTop > sBottom
        
      // );

      // if (collision) {
      //   console.log('COLLISION with valkyrie:', {
      //     valk,
      //     viking: { vLeft, vTop, vRight, vBottom },
      //     valkyrie: { sLeft, sTop, sRight, sBottom }
      //   });
      // }

      return collision;
    });

    return skeletonCollision || valkyrieCollision;
  };

  useEffect(() => {
    if (gameStarted && vikingReachedBottom && !gameOver) {
      const spawnEnemy = (canSpawnSkeleton, canSpawnValkyrie) => {
        // Double-check current counts to ensure no duplicates
        const currentSkeletonCount = skeletonCountRef.current;
        const currentValkyrieCount = valkyrieCountRef.current;

        // Choose enemy type based on availability and current counts
        let enemyType;
        if (canSpawnSkeleton && canSpawnValkyrie && currentSkeletonCount === 0 && currentValkyrieCount === 0) {
          // Both available and confirmed no existing enemies, randomly choose
          enemyType = Math.random() < 0.5 ? 'skeleton' : 'valkyrie';
        } else if (canSpawnSkeleton && currentSkeletonCount === 0) {
          enemyType = 'skeleton';
        } else if (canSpawnValkyrie && currentValkyrieCount === 0) {
          enemyType = 'valkyrie';
        } else {
          // Cannot spawn this type or type already exists
          return;
        }

        if (enemyType === 'skeleton') {
          const floorTop = window.innerHeight - getFloorHeight();
          const minLeft = 0;
          const maxLeft = window.innerWidth - 120; // ensure visible
          const baseLeft = window.innerWidth + 50;
          const left = Math.min(Math.max(baseLeft, minLeft), maxLeft);
          const top = floorTop + 50 - 120;
          const newSkeleton = {
            id: Date.now() + Math.random(),
            left,
            top,
            speed: getEnemySpeed(2, elapsedSeconds)
          };

          setSkeletons(prev => [...prev, newSkeleton]);
        } else {
          const floorTop = window.innerHeight - getFloorHeight();
          const minLeft = 0;
          const maxLeft = window.innerWidth - 120; // ensure visible
          const minTop = 30; // clamp above ground
          const maxTop = floorTop - 140; // so they don't overlap pixel floor
          const baseLeft = window.innerWidth + 50;
          const left = Math.min(Math.max(baseLeft, minLeft), maxLeft);
          let rawTop = floorTop - 150 - Math.random() * 200; // Random height between ground and upper limit
          rawTop = Math.max(Math.min(rawTop, maxTop), minTop);
          const newValkyrie = {
            id: Date.now() + Math.random() + 1000,
            left,
            top: rawTop,
            speed: getEnemySpeed(2.5, elapsedSeconds) // Slightly faster than skeletons
          };

          setValkyries(prev => [...prev, newValkyrie]);
        }
      };

      const checkAndSpawn = () => {
        // Get current enemy counts from refs (always up-to-date)
        const currentSkeletonCount = skeletonCountRef.current;
        const currentValkyrieCount = valkyrieCountRef.current;
        const totalEnemies = currentSkeletonCount + currentValkyrieCount;

        // Spawn enemy if there are less than 2 enemies on screen AND specific type is not already present
        const canSpawnSkeleton = currentSkeletonCount === 0;
        const canSpawnValkyrie = currentValkyrieCount === 0;

        if (totalEnemies < 2 && (canSpawnSkeleton || canSpawnValkyrie)) {
          spawnEnemy(canSpawnSkeleton, canSpawnValkyrie);
        }

        // Always schedule next check
        skeletonSpawnIntervalRef.current = setTimeout(() => {
          if (!gameOver) {
            checkAndSpawn();
          }
        }, 500); // Check every 500ms
      };

      // Start checking for spawn opportunities
      checkAndSpawn();

      const animateSkeletons = () => {
        if (gameOver) return;

        setSkeletons(prev => {
          const updated = prev
            .map(s => {
              // Update speed based on current elapsed time
              const currentSpeed = getEnemySpeed(2, elapsedSecondsRef.current);
              const newLeft = s.left - currentSpeed;
              return { ...s, left: newLeft, speed: currentSpeed };
            })
            .filter(s => {
              const keep = s.left > -100;
              return keep;
            });

          // Update enemy count ref
          enemiesOnScreenRef.current = updated.length + valkyrieCountRef.current;

          if (checkCollision(vikingPositionRef.current, updated, valkyries, isJumpingRef.current)) {
            setGameOver(true);
            clearTimeout(skeletonSpawnIntervalRef.current);
            clearTimeout(valkyrieSpawnIntervalRef.current);
            cancelAnimationFrame(animationFrameRef.current);
          }

          return updated;
        });

        if (!gameOver) skeletonAnimationRef.current = requestAnimationFrame(animateSkeletons);
      };

      skeletonAnimationRef.current = requestAnimationFrame(animateSkeletons);
    } else {
      setSkeletons([]);
    }

    return () => {
      if (skeletonAnimationRef.current) cancelAnimationFrame(skeletonAnimationRef.current);
      if (skeletonSpawnIntervalRef.current) clearTimeout(skeletonSpawnIntervalRef.current);
    };
  }, [gameStarted, vikingReachedBottom, gameOver]);

  useEffect(() => {
    if (gameStarted && vikingReachedBottom && !gameOver) {
      const animateValkyries = () => {
        if (gameOver) return;

        setValkyries(prev => {
          const updated = prev
            .map(v => {
              // Update speed based on current elapsed time
              const currentSpeed = getEnemySpeed(2.5, elapsedSecondsRef.current);
              const newLeft = v.left - currentSpeed;
              return { ...v, left: newLeft, speed: currentSpeed };
            })
            .filter(v => {
              const keep = v.left > -100;
              return keep;
            });

          // Update enemy count ref
          enemiesOnScreenRef.current = skeletonCountRef.current + updated.length;

          if (checkCollision(vikingPositionRef.current, skeletons, updated, isJumpingRef.current)) {
            setGameOver(true);
            clearTimeout(skeletonSpawnIntervalRef.current);
            clearTimeout(valkyrieSpawnIntervalRef.current);
            cancelAnimationFrame(animationFrameRef.current);
          }

          return updated;
        });

        if (!gameOver) valkyrieAnimationRef.current = requestAnimationFrame(animateValkyries);
      };

      valkyrieAnimationRef.current = requestAnimationFrame(animateValkyries);
    } else {
      setValkyries([]);
    }

    return () => {
      if (valkyrieAnimationRef.current) cancelAnimationFrame(valkyrieAnimationRef.current);
    };
  }, [gameStarted, vikingReachedBottom, gameOver, skeletons]);

  useEffect(() => {
    if (gameOver) submitScore();
  }, [gameOver]);

  const handleStartGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setVikingReachedBottom(false);
    setIsJumping(false);
    setVikingPosition({ top: -100, left: 0 });
    setSkeletons([]);
    setValkyries([]);
    enemiesOnScreenRef.current = 0;
    velocityRef.current = 0;
    setElapsedSeconds(0);
    scoreSubmittedRef.current = false;
  };

  const handleRestart = () => handleStartGame();
  const handleMainMenu = () => setGameStarted(false);
  const handleRecords = () => navigate('/records');

  const performJump = (pressure = 0.5) => {
    if (gameStarted && vikingReachedBottom && !gameOver && !isJumping) {
      // Calculate jump height based on pressure (0-1 scale, mapped to minJump-maxJump)
      const minJump = 90;
      const maxJump = 400;
      const calculatedHeight = minJump + pressure * (maxJump - minJump);
      setCurrentJumpHeight(calculatedHeight);

      if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);

      setIsJumping(true);

      // Use JavaScript animation instead of CSS for dynamic height control
      if (vikingRef.current) {
        let startTime = null;
        const duration = 800; // 800ms jump duration

        const animateJump = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Sine wave for smooth jump arc
          const jumpProgress = Math.sin(progress * Math.PI);
          const currentHeight = calculatedHeight * jumpProgress;

          vikingRef.current.style.transform = `translateY(-${currentHeight}px)`;

          if (progress < 1) {
            requestAnimationFrame(animateJump);
          } else {
            // Jump finished
            vikingRef.current.style.transform = '';
            setIsJumping(false);
          }
        };

        requestAnimationFrame(animateJump);
      }

      jumpTimeoutRef.current = setTimeout(() => {
        setIsJumping(false);
        jumpTimeoutRef.current = null;
      }, 800);
    }
  };

  const handlePointerDown = (e) => {
    // Only handle pointer for jumping if not clicking on buttons
    if (e.target.tagName === 'BUTTON') return;

    e.preventDefault();
    if (!isJumping && gameStarted && vikingReachedBottom && !gameOver) {
      // Capture pressure and timestamp
      const pressure = e.pressure !== undefined ? e.pressure : 0.5;
      setPointerPressure(pressure);
      setPointerDownTime(Date.now());
    }
  };

  const handlePointerUp = (e) => {
    // Only handle pointer for jumping if not clicking on buttons
    if (e.target.tagName === 'BUTTON') return;

    e.preventDefault();
    if (pointerDownTime && !isJumping && gameStarted && vikingReachedBottom && !gameOver) {
      // Calculate duration-based pressure as fallback
      const duration = Date.now() - pointerDownTime;
      const durationPressure = Math.min(1, Math.max(0, duration / 1000)); // Scale to 0-1 over 1 second

      // Use the maximum of pressure and duration-based pressure
      const finalPressure = Math.max(pointerPressure, durationPressure);

      performJump(finalPressure);
      setPointerPressure(0.5);
      setPointerDownTime(null);
    }
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <div
      className={`start-page ${gameStarted && vikingReachedBottom ? 'game-active' : ''} ${gameOver ? 'game-paused' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      <div className="parallax-bg bg-image"></div>

      <div className="score-timer"> SCORE: {elapsedSeconds}</div>

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
            className={`viking-animation-container
              ${vikingReachedBottom ? 'viking-running' : 'viking-falling'}
              ${isJumping ? 'viking-jumping' : ''}`}
            style={{ top: `${vikingPosition.top}px`, left: `${vikingPosition.left}px` }}
          >
            {!vikingReachedBottom ? (
              <AnimatedSprite images={start_viking} frameDuration={200} width="120px" height="120px" />
            ) : (
              <AnimatedSprite
                images={isJumping ? viking_jump : viking_run}
                frameDuration={isJumping ? 120 : 150}
                width="120px"
                height="120px"
              />
            )}
          </div>

          {skeletons.map(s => {
            return (
              <div key={s.id} className="skeleton-container" style={{ top: `${s.top}px`, left: `${s.left}px` }}>
                <AnimatedSprite images={skeleton} frameDuration={200} width="120px" height="120px" />
              </div>
            );
          })}

          {valkyries.map(v => {
            return (
              <div key={v.id} className="flying-enemy-container" style={{ top: `${v.top}px`, left: `${v.left}px` }}>
                <AnimatedSprite images={valkyrie} frameDuration={150} width="120px" height="120px" />
              </div>
            );
          })}

          <div className="pixel-floor"></div>

          {gameOver && (
            <div className="game-over-overlay">
              <h2 className="game-over-text">GAME OVER</h2>
              <button className="restart-button" onClick={handleRestart}>Restart</button>
              <button className="restart-button" onClick={handleMainMenu}>Main Menu</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StartPage;
