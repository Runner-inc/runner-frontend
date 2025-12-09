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
  const [telegramUserId, setTelegramUserId] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);

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
  const gravity = 0.8;

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

  const checkCollision = (vPos, skeletonList, valkyrieList, jumping) => {
    const spriteSize = 75;
    const collisionSize = 45;
    const padding = (spriteSize - collisionSize) / 2;
    const vTop = vPos.top + padding + (jumping ? -225 : 0);
    const vLeft = vPos.left + padding;

    // Check skeleton collisions
    const skeletonCollision = skeletonList.some(skel => {
      const sTop = skel.top + padding;
      const sLeft = skel.left + padding;
      return (
        vLeft < sLeft + collisionSize &&
        vLeft + collisionSize > sLeft &&
        vTop < sTop + collisionSize &&
        vTop + collisionSize > sTop
      );
    });

    // Check valkyrie collisions
    const valkyrieCollision = valkyrieList.some(valk => {
      const sTop = valk.top + padding;
      const sLeft = valk.left + padding;
      return (
        vLeft < sLeft + collisionSize &&
        vLeft + collisionSize > sLeft &&
        vTop < sTop + collisionSize &&
        vTop + collisionSize > sTop
      );
    });

    return skeletonCollision || valkyrieCollision;
  };

  useEffect(() => {
    if (gameStarted && vikingReachedBottom && !gameOver) {
      const spawnSkeleton = () => {
        const floorTop = window.innerHeight - getFloorHeight();
        const skeletonCount = 1 + Math.floor(Math.random() * 3);
        const baseLeft = window.innerWidth + 50;

        const newSkeletons = Array.from({ length: skeletonCount }, (_, i) => ({
          id: Date.now() + Math.random() + i,
          left: baseLeft + i * 25,
          top: floorTop + 29 - 75,
          speed: 2 + Math.random() * 2
        }));

        setSkeletons(prev => [...prev, ...newSkeletons]);
      };

      const scheduleSpawn = () => {
        skeletonSpawnIntervalRef.current = setTimeout(() => {
          if (!gameOver) {
            spawnSkeleton();
            scheduleSpawn();
          }
        }, 2000 + Math.random() * 3000);
      };

      scheduleSpawn();

      const animateSkeletons = () => {
        if (gameOver) return;

        setSkeletons(prev => {
          const updated = prev
            .map(s => ({ ...s, left: s.left - s.speed }))
            .filter(s => s.left > -100);

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
  }, [gameStarted, vikingReachedBottom, gameOver, valkyries]);

  useEffect(() => {
    if (gameStarted && vikingReachedBottom && !gameOver) {
      const spawnValkyrie = () => {
        const floorTop = window.innerHeight - getFloorHeight();
        const valkyrieCount = 1 + Math.floor(Math.random() * 2);
        const baseLeft = window.innerWidth + 50;

        const newValkyries = Array.from({ length: valkyrieCount }, (_, i) => ({
          id: Date.now() + Math.random() + i + 1000, // offset to avoid id conflicts with skeletons
          left: baseLeft + i * 30,
          top: floorTop - 150 - Math.random() * 200, // spawn at different heights above ground
          speed: 2.5 + Math.random() * 1.5
        }));

        setValkyries(prev => [...prev, ...newValkyries]);
      };

      const scheduleValkyrieSpawn = () => {
        valkyrieSpawnIntervalRef.current = setTimeout(() => {
          if (!gameOver) {
            spawnValkyrie();
            scheduleValkyrieSpawn();
          }
        }, 3000 + Math.random() * 4000); // spawn less frequently than skeletons
      };

      scheduleValkyrieSpawn();

      const animateValkyries = () => {
        if (gameOver) return;

        setValkyries(prev => {
          const updated = prev
            .map(v => ({ ...v, left: v.left - v.speed }))
            .filter(v => v.left > -100);

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
      if (valkyrieSpawnIntervalRef.current) clearTimeout(valkyrieSpawnIntervalRef.current);
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
    velocityRef.current = 0;
    setElapsedSeconds(0);
    scoreSubmittedRef.current = false;
  };

  const handleRestart = () => handleStartGame();
  const handleMainMenu = () => setGameStarted(false);
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

  const handlePageTouch = e => { e.preventDefault(); handlePageClick(); };

  if (error) return <div className="error">{error}</div>;

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
          autoPlay muted loop playsInline preload="auto"
        />
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

          {valkyries.map(v => (
            <div key={v.id} className="flying-enemy-container" style={{ top: `${v.top}px`, left: `${v.left}px` }}>
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
