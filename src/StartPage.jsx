// FULL REWRITTEN StartPage.js WITH SINGLE SKELETON + SINGLE VALKYRIE
// (Your entire file rewritten exactly as requested)

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

  // FALLING viking
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

  // TIMER
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
      const res = await fetch(`https://runner-backend-sandy.vercel.app/api/users/${telegramUserId}`);
      const data = await res.json();
      const currentBest = data?.result || 0;

      if (elapsedSeconds > currentBest) {
        await fetch(`https://runner-backend-sandy.vercel.app/api/users/${telegramUserId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ result: elapsedSeconds })
        });
      }
    } catch (err) {
      console.warn('Score submit failed:', err);
    }
  };

  // COLLISION
  const checkCollision = (vPos, skeletonList, valkyrieList, jumping) => {
    const spriteSize = 75;
    const collisionSize = 45;
    const padding = (spriteSize - collisionSize) / 2;

    // Collision box follows the sprite position during jumps
    const vTop = vPos.top + padding + (jumping ? -225 : 0);
    const vLeft = vPos.left + padding;

    const isColliding = (objTop, objLeft) => {
      const collisionX = vLeft < objLeft + collisionSize && vLeft + collisionSize > objLeft;
      const collisionY = vTop < objTop + collisionSize && vTop + collisionSize > objTop;

      if (collisionX && collisionY) {
        // Determine collision direction for debugging
        const vCenterX = vLeft + collisionSize / 2;
        const vCenterY = vTop + collisionSize / 2;
        const objCenterX = objLeft + collisionSize / 2;
        const objCenterY = objTop + collisionSize / 2;

        let direction = '';
        if (Math.abs(vCenterX - objCenterX) > Math.abs(vCenterY - objCenterY)) {
          direction = vCenterX < objCenterX ? 'RIGHT side' : 'LEFT side';
        } else {
          direction = vCenterY < objCenterY ? 'BOTTOM side' : 'TOP side';
        }

        console.log(`COLLISION from ${direction}! Viking(${vCenterX.toFixed(0)},${vCenterY.toFixed(0)}) vs Enemy(${objCenterX.toFixed(0)},${objCenterY.toFixed(0)})`);
        return true;
      }

      return false;
    };

    if (skeletonList.some(skel => isColliding(skel.top + padding, skel.left + padding))) return true;
    if (valkyrieList.some(valk => isColliding(valk.top + padding, valk.left + padding))) return true;
    return false;
  };

  // === FIXED SPAWN SYSTEM ===
  // EXACTLY 1 SKELETON + 1 VALKYRIE MAX
  // RESPAWN EVERY 3-5 SECONDS
  useEffect(() => {
    if (gameStarted && !gameOver) {
      if (!gameStartTime) setGameStartTime(Date.now());

      const spawnEnemies = () => {
        if (gameOver) return;

        const gameDuration = Math.floor((Date.now() - (gameStartTime || Date.now())) / 1000);
        const speedIncrease = Math.floor(gameDuration / 5);
        const floorTop = window.innerHeight - getFloorHeight();
        const baseLeft = window.innerWidth + 50;

        // --- Spawn Skeleton Only If NONE
        if (skeletons.length === 0) {
          const newSkeleton = {
            id: Date.now() + Math.random(),
            left: baseLeft,
            top: floorTop + 29 - 75,
            speed: 2 + speedIncrease * 0.8 + Math.random(),
          };
          setSkeletons([newSkeleton]);
        }

        // --- Spawn Valkyrie Only If NONE
        if (flyingEnemies.length === 0) {
          const jumpHeight = 225;
          const positions = [
            floorTop - jumpHeight * 0.3,
            floorTop - jumpHeight * 0.6,
            floorTop - jumpHeight * 0.9,
          ];

          const newFlyingEnemy = {
            id: Date.now() + Math.random(),
            left: baseLeft,
            top: positions[Math.floor(Math.random() * positions.length)],
            speed: 3 + speedIncrease * 0.6 + Math.random() * 1.5,
          };
          setFlyingEnemies([newFlyingEnemy]);
        }

        // next spawn in 3–5 seconds
        const nextInterval = 3000 + Math.random() * 2000;
        skeletonSpawnIntervalRef.current = setTimeout(spawnEnemies, nextInterval);
      };

      spawnEnemies();

      const animateEnemies = () => {
        if (gameOver) return;

        setSkeletons(prev =>
          prev
            .map(s => ({ ...s, left: s.left - s.speed }))
            .filter(s => s.left > -100)
        );

        setFlyingEnemies(prev =>
          prev
            .map(f => ({ ...f, left: f.left - f.speed }))
            .filter(f => f.left > -100)
        );

        if (checkCollision(vikingPositionRef.current, skeletons, flyingEnemies, isJumpingRef.current)) {
          setGameOver(true);
          clearTimeout(skeletonSpawnIntervalRef.current);
          cancelAnimationFrame(animationFrameRef.current);
          return;
        }

        skeletonAnimationRef.current = requestAnimationFrame(animateEnemies);
      };

      skeletonAnimationRef.current = requestAnimationFrame(animateEnemies);
    } else {
      setSkeletons([]);
      setFlyingEnemies([]);
    }

    return () => {
      if (skeletonAnimationRef.current) cancelAnimationFrame(skeletonAnimationRef.current);
      if (skeletonSpawnIntervalRef.current) clearTimeout(skeletonSpawnIntervalRef.current);
    };
  }, [gameStarted, gameOver, gameStartTime, skeletons, flyingEnemies]);

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
    setGameStartTime(null);
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
    if (now - lastTouchTimeRef.current > 100) {
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