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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const vikingRef = useRef(null);
  const floorRef = useRef(null);
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

  useEffect(() => { vikingPositionRef.current = vikingPosition; }, [vikingPosition]);
  useEffect(() => { isJumpingRef.current = isJumping; }, [isJumping]);

  useEffect(() => {
  const tg = window.Telegram?.WebApp;

  if (!tg) {
    setError('Telegram WebApp API is unavailable. Please open this app in Telegram.');
    setLoading(false);
    return;
  }

  tg.ready();

  const telegramUserId = tg.initDataUnsafe?.user?.id;

  if (telegramUserId) {
    setTelegramUserId(String(telegramUserId)); // для fetch
    setLoading(false);
  } else {
    setError('User ID not found in Telegram WebApp data');
    setLoading(false);
  }
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
      const startFalling = () => {
        const animate = () => {
          setVikingPosition(prev => {
            const newTop = prev.top + velocityRef.current;
            velocityRef.current += gravity;

            const viewportHeight = window.innerHeight;
            const floorHeight = getFloorHeight();
            const floorTop = viewportHeight - floorHeight + 29;

            if (newTop + 75 >= floorTop) {
              setVikingReachedBottom(true);
              velocityRef.current = 0;
              return { top: floorTop - 75, left: 0 };
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
      await fetch(`https://runner-backend-sandy.vercel.app/api/users/${telegramUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: elapsedSeconds })
      });
    } catch (err) {
      console.warn("Score submit failed:", err);
    }
  };

  const checkCollision = (vikingPos, skeletonList, jumping) => {
    const spriteSize = 75;
    const collisionSize = 45;
    const padding = (spriteSize - collisionSize) / 2;

    const vTop = vikingPos.top + padding + (jumping ? -225 : 0);
    const vLeft = vikingPos.left + padding;

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
    if (gameStarted && vikingReachedBottom && !gameOver) {
      const spawnSkeleton = () => {
        const viewportHeight = window.innerHeight;
        const floorHeight = getFloorHeight();
        const floorTop = viewportHeight - floorHeight;

        const skeletonCount = 1 + Math.floor(Math.random() * 3);
        const baseLeft = window.innerWidth + 50;
        const skeletonSpeed = 2 + Math.random() * 2;

        const newSkeletons = Array.from({ length: skeletonCount }, (_, i) => ({
          id: Date.now() + Math.random() + i,
          left: baseLeft + i * 25,
          top: floorTop + 29 - 75,
          speed: skeletonSpeed
        }));

        setSkeletons(prev => [...prev, ...newSkeletons]);
      };

      const scheduleNextSpawn = () => {
        skeletonSpawnIntervalRef.current = setTimeout(() => {
          if (!gameOver) {
            spawnSkeleton();
            scheduleNextSpawn();
          }
        }, 2000 + Math.random() * 3000);
      };

      scheduleNextSpawn();

      const animateSkeletons = () => {
        if (gameOver) return;

        setSkeletons(prev => {
          const updated = prev
            .map(skel => ({ ...skel, left: skel.left - skel.speed }))
            .filter(s => s.left > -100);

          // Collision detection — now WITHOUT submitScore()
          if (!gameOver && checkCollision(vikingPositionRef.current, updated, isJumpingRef.current)) {
            setGameOver(true);
            clearTimeout(skeletonSpawnIntervalRef.current);
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

  // 🔥 NEW: отправляем результат строго после Game Over
  useEffect(() => {
    if (gameOver) {
      submitScore();
    }
  }, [gameOver]);

  const handleStartGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setVikingReachedBottom(false);
    setIsJumping(false);
    setVikingPosition({ top: -100, left: 0 });
    setSkeletons([]);
    velocityRef.current = 0;
    setElapsedSeconds(0);
    scoreSubmittedRef.current = false;
  };

  const handleRestart = () => handleStartGame();

  const handleMainMenu = () => {
    setGameStarted(false);
    setGameOver(false);
    setVikingReachedBottom(false);
    setIsJumping(false);
    setSkeletons([]);
    velocityRef.current = 0;
    setElapsedSeconds(0);
  };

  const handleRecords = () => navigate('/records');

  const handlePageClick = () => {
    if (gameStarted && vikingReachedBottom && !gameOver) {
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

  const handlePageTouch = (e) => {
    e.preventDefault();
    handlePageClick();
  };

  return (
    <div
      className={`start-page ${gameStarted && vikingReachedBottom ? 'game-active' : ''} ${gameOver ? 'game-paused' : ''}`}
      onClick={handlePageClick}
      onTouchStart={handlePageTouch}
    >
      <div className="parallax-bg">
        <video
          className="bg-video"
          src="https://hwkaeeogqacgsfvbnfss.supabase.co/storage/v1/object/sign/viking_runner/grok-video-417d7c90-9f51-4e07-93c7-09cd5a9be976%20(online-video-cutter.com).mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xNjk2MjFhNC04ZjgxLTRhMWItODNhZC0yMzRkNzBmODFjYWIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aWtpbmdfcnVubmVyL2dyb2stdmlkZW8tNDE3ZDdjOTAtOWY1MS00ZTA3LTkzYzctMDljZDVhOWJlOTc2IChvbmxpbmUtdmlkZW8tY3V0dGVyLmNvbSkubXA0IiwiaWF0IjoxNzY1MDI5NDY4LCJleHAiOjc3NTY4Njk0Njh9.T_MMv3XFjv8dldEEf5U3Zh3XO-3nPKk0pXV8Z3MAmm4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      </div>

      <div className="score-timer">{elapsedSeconds}s</div>

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
            <div
              key={s.id}
              className="skeleton-container"
              style={{ top: `${s.top}px`, left: `${s.left}px` }}
            >
              <AnimatedSprite images={skeleton} frameDuration={200} width="75px" height="75px" />
            </div>
          ))}

          <div ref={floorRef} className="pixel-floor"></div>

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
