// FULL FIXED StartPage.js — Buttons no longer trigger jumps or game start

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
    const uid = tg.initDataUnsafe?.user?.id;
    if (uid) setTelegramUserId(String(uid));
    else setError('User ID not found in Telegram WebApp data');
  }, []);

  const getFloorHeight = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w >= 1440) return 140;
    if (w >= 769 && w <= 1024) return 100;
    if (h <= 500) return 70;
    if (w <= 480) return 80;
    if (w <= 768) return 90;
    return 120;
  };

  // FALLING
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
  const checkCollision = (vPos, skList, vList, jumping) => {
    const size = 75;
    const hitSize = 45;
    const pad = (size - hitSize) / 2;

    const vTop = vPos.top + pad + (jumping ? -225 : 0);
    const vLeft = vPos.left + pad;

    const hit = (t, l) => (
      vLeft < l + hitSize && vLeft + hitSize > l &&
      vTop < t + hitSize && vTop + hitSize > t
    );

    if (skList.some(s => hit(s.top + pad, s.left + pad))) return true;
    if (vList.some(f => hit(f.top + pad, f.left + pad))) return true;

    return false;
  };

  // SPAWN SYSTEM — EXACTLY ONE skeleton + one valkyrie
  useEffect(() => {
    if (gameStarted && !gameOver) {
      if (!gameStartTime) setGameStartTime(Date.now());

      const spawn = () => {
        if (gameOver) return;

        const duration = Math.floor((Date.now() - (gameStartTime || Date.now())) / 1000);
        const speedUp = Math.floor(duration / 5);
        const floorTop = window.innerHeight - getFloorHeight();
        const baseLeft = window.innerWidth + 50;

        // Skeleton
        if (skeletons.length === 0) {
          setSkeletons([{
            id: Date.now() + Math.random(),
            left: baseLeft,
            top: floorTop + 29 - 75,
            speed: 2 + speedUp * 0.8 + Math.random(),
          }]);
        }

        // Valkyrie
        if (flyingEnemies.length === 0) {
          const jumpH = 225;
          const positions = [
            floorTop - jumpH * 0.3,
            floorTop - jumpH * 0.6,
            floorTop - jumpH * 0.9
          ];

          setFlyingEnemies([{
            id: Date.now() + Math.random(),
            left: baseLeft,
            top: positions[Math.floor(Math.random() * positions.length)],
            speed: 3 + speedUp * 0.6 + Math.random() * 1.5,
          }]);
        }

        skeletonSpawnIntervalRef.current = setTimeout(spawn, 3000 + Math.random() * 2000);
      };

      spawn();

      const animate = () => {
        if (gameOver) return;

        setSkeletons(prev =>
          prev.map(s => ({ ...s, left: s.left - s.speed })).filter(s => s.left > -100)
        );
        setFlyingEnemies(prev =>
          prev.map(f => ({ ...f, left: f.left - f.speed })).filter(f => f.left > -100)
        );

        if (checkCollision(vikingPositionRef.current, skeletons, flyingEnemies, isJumpingRef.current)) {
          setGameOver(true);
          clearTimeout(skeletonSpawnIntervalRef.current);
          cancelAnimationFrame(animationFrameRef.current);
          return;
        }

        skeletonAnimationRef.current = requestAnimationFrame(animate);
      };

      skeletonAnimationRef.current = requestAnimationFrame(animate);
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

  const handleStartGame = (e) => {
    if (e) e.stopPropagation();
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

  const handleRecords = (e) => {
    if (e) e.stopPropagation();
    navigate('/records');
  };

  const handleRestart = (e) => {
    if (e) e.stopPropagation();
    handleStartGame();
  };

  const handleMainMenu = (e) => {
    if (e) e.stopPropagation();
    setGameStarted(false);
  };

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

            {/* FIX: prevent propagation */}
            <button
              className="start-button"
              onClick={(e) => {
                e.stopPropagation();
                handleStartGame(e);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStartGame(e);
              }}
            >
              Start Game
            </button>

            {/* FIX: prevent propagation */}
            <button
              className="records-button"
              onClick={(e) => {
                e.stopPropagation();
                handleRecords(e);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRecords(e);
              }}
            >
              Records
            </button>

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

              <button
                className="restart-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRestart(e);
                }}
              >
                Restart
              </button>

              <button
                className="restart-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMainMenu(e);
                }}
              >
                Main Menu
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StartPage;
