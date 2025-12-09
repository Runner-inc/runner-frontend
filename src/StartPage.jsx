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
  const [flyingEnemies, setFlyingEnemies] = useState([]);
  const [telegramUserId, setTelegramUserId] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);

  const vikingRef = useRef(null);
  const animationFrameRef = useRef(null);
  const skeletonAnimationRef = useRef(null);
  const skeletonSpawnIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const scoreSubmittedRef = useRef(false);
  const velocityRef = useRef(0);
  const jumpTimeoutRef = useRef(null);
  const vikingPositionRef = useRef(vikingPosition);
  const isJumpingRef = useRef(isJumping);
  const gravity = 0.8;
  const lastTouchTimeRef = useRef(0);

  useEffect(() => { vikingPositionRef.current = vikingPosition; }, [vikingPosition]);
  useEffect(() => { isJumpingRef.current = isJumping; }, [isJumping]);

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
    if (width >= 1440) return 140;
    if (width >= 769 && width <= 1024) return 100;
    if (height <= 500) return 70;
    if (width <= 480) return 80;
    if (width <= 768) return 90;
    return 120;
  };

  useEffect(() => {
    if (gameStarted && !vikingReachedBottom && !gameOver) {
      const animateFall = () => {
        setVikingPosition(prev => {
          const newTop = prev.top + velocityRef.current;
          velocityRef.current += gravity;
          const floorTop = window.innerHeight - getFloorHeight() + 29;
          if (newTop + 75 >= floorTop) {
            setVikingReachedBottom(true);
            velocityRef.current = 0;
            return { top: floorTop - 75, left: 0 };
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

  const checkCollision = (vPos, skeletonList, jumping) => {
    const spriteSize = 75;
    const collisionSize = 45;
    const padding = (spriteSize - collisionSize) / 2;
    const vTop = vPos.top + padding + (jumping ? -225 : 0);
    const vLeft = vPos.left + padding;

    return skeletonList.some(skel => {
      const sTop = skel.top + padding;
      const sLeft = skel.left + padding;
      return (
        vLeft < sLeft + collisionSize &&
        vLeft + collisionSize > sLeft &&
        vTop < sTop + collisionSize &&
        vTop + collisionSize > sTop
      );
    });
  };

  useEffect(() => {
    if (gameStarted && !gameOver) {
      // Set game start time if not set
      if (!gameStartTime) {
        setGameStartTime(Date.now());
      }

      const spawnSkeleton = () => {
        const floorTop = window.innerHeight - getFloorHeight();
        const baseLeft = window.innerWidth + 50;

        // Calculate game duration in seconds
        const gameDuration = Math.floor((Date.now() - (gameStartTime || Date.now())) / 1000);

        // Base speed increases every 5 seconds
        const speedIncrease = Math.floor(gameDuration / 5);
        const baseSpeed = 2 + speedIncrease * 0.8; // Increase by 0.8 every 5 seconds

        // Spawn exactly 1 skeleton
        const newSkeleton = {
          id: Date.now() + Math.random(),
          left: baseLeft,
          top: floorTop + 29 - 75,
          speed: baseSpeed + Math.random() * 1 // Some random variation
        };

        setSkeletons(prev => [...prev, newSkeleton]);
      };

      const spawnFlyingEnemy = () => {
        const baseLeft = window.innerWidth + 50;
        const floorTop = window.innerHeight - getFloorHeight();

        // Calculate game duration in seconds
        const gameDuration = Math.floor((Date.now() - (gameStartTime || Date.now())) / 1000);

        // Base speed increases every 5 seconds
        const speedIncrease = Math.floor(gameDuration / 5);
        const baseSpeed = 3 + speedIncrease * 0.6; // Flying enemies are faster

        // Position valkyries within Viking's jump range (0-225px above ground)
        const jumpHeight = 225;
        const positions = [
          floorTop - jumpHeight * 0.3, // Low in jump range
          floorTop - jumpHeight * 0.6, // Medium in jump range
          floorTop - jumpHeight * 0.9  // High in jump range
        ];

        const randomY = positions[Math.floor(Math.random() * positions.length)];

        // Spawn exactly 1 flying enemy
        const newFlyingEnemy = {
          id: Date.now() + Math.random(),
          left: baseLeft,
          top: randomY,
          speed: baseSpeed + Math.random() * 1.5 // Some random variation
        };

        setFlyingEnemies(prev => [...prev, newFlyingEnemy]);
      };

      const scheduleSpawn = () => {
        // Calculate game duration in seconds
        const gameDuration = Math.floor((Date.now() - (gameStartTime || Date.now())) / 1000);

        // Initial spawn rate: 3000ms
        // Every 5 seconds, decrease interval by 300ms, minimum 600ms
        const baseInterval = 3000;
        const decreasePer5Seconds = 300;
        const maxDecreases = Math.floor(gameDuration / 5);
        const currentInterval = Math.max(600, baseInterval - (maxDecreases * decreasePer5Seconds));

        // Add some randomness (±500ms)
        const randomVariation = Math.random() * 1000 - 500;
        const finalInterval = Math.max(500, currentInterval + randomVariation);

        skeletonSpawnIntervalRef.current = setTimeout(() => {
          if (!gameOver) {
            spawnSkeleton();
            // Spawn flying enemy regularly (every 2nd skeleton spawn)
            if (Math.random() < 0.5) { // 50% chance
              spawnFlyingEnemy();
            }
            scheduleSpawn();
          }
        }, finalInterval);
      };

      scheduleSpawn();

      const animateSkeletons = () => {
        if (gameOver) return;

        setSkeletons(prev => {
          const updated = prev
            .map(s => ({ ...s, left: s.left - s.speed }))
            .filter(s => s.left > -100);

          setFlyingEnemies(flyingPrev => {
            const flyingUpdated = flyingPrev
              .map(enemy => ({ ...enemy, left: enemy.left - enemy.speed }))
              .filter(enemy => enemy.left > -100);

            // Check collision with both updated skeletons and flying enemies
            const allEnemies = [...updated, ...flyingUpdated];
            if (checkCollision(vikingPositionRef.current, allEnemies, isJumpingRef.current)) {
              setGameOver(true);
              clearTimeout(skeletonSpawnIntervalRef.current);
              cancelAnimationFrame(animationFrameRef.current);
            }

            return flyingUpdated;
          });

          return updated;
        });

        if (!gameOver) skeletonAnimationRef.current = requestAnimationFrame(animateSkeletons);
      };

      skeletonAnimationRef.current = requestAnimationFrame(animateSkeletons);
    } else {
      setSkeletons([]);
      setFlyingEnemies([]);
    }

    return () => {
      if (skeletonAnimationRef.current) cancelAnimationFrame(skeletonAnimationRef.current);
      if (skeletonSpawnIntervalRef.current) clearTimeout(skeletonSpawnIntervalRef.current);
    };
  }, [gameStarted, gameOver, gameStartTime]);

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
    setFlyingEnemies([]);
    velocityRef.current = 0;
    setElapsedSeconds(0);
    setGameStartTime(null); // Reset game start time
    scoreSubmittedRef.current = false;
  };

  const handleRestart = () => handleStartGame();
  const handleMainMenu = () => setGameStarted(false);
  const handleRecords = () => navigate('/records');

  const handlePageClick = () => {
    if (gameStarted && !gameOver && !isJumping) {
      if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
      if (vikingRef.current) {
        vikingRef.current.classList.remove('viking-jumping');
        void vikingRef.current.offsetWidth;
        vikingRef.current.classList.add('viking-jumping');
      }
      setIsJumping(true);
      jumpTimeoutRef.current = setTimeout(() => {
        setIsJumping(false);
        if (vikingRef.current) vikingRef.current.classList.remove('viking-jumping');
        jumpTimeoutRef.current = null;
      }, 800);
    }
  };

  const handlePageTouch = e => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastTouchTimeRef.current > 100) { // 100ms debounce
      lastTouchTimeRef.current = now;
      handlePageClick();
    }
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <div
      className={`start-page ${gameStarted ? 'game-active' : ''} ${gameOver ? 'game-paused' : ''}`}
      onClick={handlePageClick}
      onTouchStart={handlePageTouch}
    >
      <div className="parallax-bg">
        <div className="bg-image"></div>
      </div>

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
              <AnimatedSprite images={start_viking} frameDuration={200} width="75px" height="75px" />
            ) : (
              <AnimatedSprite
                images={isJumping ? viking_jump : viking_run}
                frameDuration={isJumping ? 120 : 150}
                width="75px"
                height="75px"
              />
            )}
          </div>

          {skeletons.map(s => (
            <div key={s.id} className="skeleton-container" style={{ top: `${s.top}px`, left: `${s.left}px` }}>
              <AnimatedSprite images={skeleton} frameDuration={200} width="75px" height="75px" />
            </div>
          ))}

          {flyingEnemies.map(enemy => (
            <div key={enemy.id} className="flying-enemy-container" style={{ top: `${enemy.top}px`, left: `${enemy.left}px` }}>
              <AnimatedSprite images={valkyrie} frameDuration={150} width="75px" height="75px" />
            </div>
          ))}

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
