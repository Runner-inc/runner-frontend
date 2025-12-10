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

  const spriteSize = 75;        // Размер спрайта викинга
  const collisionPadding = 15;  // Отступ для коллизии

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
          if (newTop + spriteSize >= floorTop) {
            setVikingReachedBottom(true);
            velocityRef.current = 0;
            return { top: floorTop - spriteSize, left: 0 };
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
      console.warn("Score submit failed:", err);
    }
  };

  const checkCollision = (vPos, skeletonList, valkyrieList) => {
    const vTop = vPos.top + collisionPadding;
    const vLeft = vPos.left + collisionPadding;
    const vRight = vLeft + spriteSize - 2 * collisionPadding;
    const vBottom = vTop + spriteSize - 2 * collisionPadding;

    const checkRectCollision = (rect1, rect2) => (
      rect1.left < rect2.right &&
      rect1.right > rect2.left &&
      rect1.top < rect2.bottom &&
      rect1.bottom > rect2.top
    );

    const skeletonCollision = skeletonList.some(skel => {
      const skelRect = {
        top: skel.top + collisionPadding,
        left: skel.left + collisionPadding,
        right: skel.left + spriteSize - collisionPadding,
        bottom: skel.top + spriteSize - collisionPadding
      };
      return checkRectCollision({ top: vTop, left: vLeft, right: vRight, bottom: vBottom }, skelRect);
    });

    const valkyrieCollision = valkyrieList.some(valk => {
      const valkRect = {
        top: valk.top + collisionPadding,
        left: valk.left + collisionPadding,
        right: valk.left + spriteSize - collisionPadding,
        bottom: valk.top + spriteSize - collisionPadding
      };
      return checkRectCollision({ top: vTop, left: vLeft, right: vRight, bottom: vBottom }, valkRect);
    });

    return skeletonCollision || valkyrieCollision;
  };

  // --- Spawn and animate skeletons ---
  useEffect(() => {
    if (gameStarted && vikingReachedBottom && !gameOver) {
      const spawnSkeleton = () => {
        if (skeletons.length === 0 && enemiesOnScreenRef.current < 2) {
          const floorTop = window.innerHeight - getFloorHeight();
          const left = window.innerWidth + 50;
          const top = floorTop + 29 - spriteSize;
          const newSkeleton = { id: Date.now(), top, left, speed: 2 + Math.random() * 2 };
          setSkeletons([newSkeleton]);
          enemiesOnScreenRef.current += 1;
        }
      };

      const animateSkeletons = () => {
        setSkeletons(prev => prev
          .map(s => ({ ...s, left: s.left - s.speed }))
          .filter(s => s.left > -100)
        );

        if (checkCollision(vikingPositionRef.current, skeletons, valkyries)) {
          setGameOver(true);
        }

        if (!gameOver) skeletonAnimationRef.current = requestAnimationFrame(animateSkeletons);
      };

      spawnSkeleton();
      skeletonAnimationRef.current = requestAnimationFrame(animateSkeletons);

      return () => {
        if (skeletonAnimationRef.current) cancelAnimationFrame(skeletonAnimationRef.current);
      };
    }
  }, [gameStarted, vikingReachedBottom, gameOver, skeletons, valkyries]);

  // --- Spawn and animate valkyries ---
  useEffect(() => {
    if (gameStarted && vikingReachedBottom && !gameOver) {
      const spawnValkyrie = () => {
        if (valkyries.length === 0 && enemiesOnScreenRef.current < 2) {
          const floorTop = window.innerHeight - getFloorHeight();
          const left = window.innerWidth + 50;
          const top = Math.max(30, floorTop - 150 - Math.random() * 200);
          const newValk = { id: Date.now() + 1000, top, left, speed: 2.5 + Math.random() * 1.5 };
          setValkyries([newValk]);
          enemiesOnScreenRef.current += 1;
        }
      };

      const animateValkyries = () => {
        setValkyries(prev => prev
          .map(v => ({ ...v, left: v.left - v.speed }))
          .filter(v => v.left > -100)
        );

        if (checkCollision(vikingPositionRef.current, skeletons, valkyries)) {
          setGameOver(true);
        }

        if (!gameOver) valkyrieAnimationRef.current = requestAnimationFrame(animateValkyries);
      };

      spawnValkyrie();
      valkyrieAnimationRef.current = requestAnimationFrame(animateValkyries);

      return () => {
        if (valkyrieAnimationRef.current) cancelAnimationFrame(valkyrieAnimationRef.current);
      };
    }
  }, [gameStarted, vikingReachedBottom, gameOver, skeletons, valkyries]);

  useEffect(() => { if (gameOver) submitScore(); }, [gameOver]);

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

  const handlePageClick = () => {
    if (gameStarted && vikingReachedBottom && !gameOver && !isJumping) {
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
    if (e.type === 'touchstart' && !isJumping) handlePageClick();
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <div
      className={`start-page ${gameStarted && vikingReachedBottom ? 'game-active' : ''} ${gameOver ? 'game-paused' : ''}`}
      onClick={handlePageClick}
      onTouchStart={handlePageTouch}
      onTouchEnd={(e) => e.preventDefault()}
    >
      <div className="parallax-bg">
        <video
          className="bg-video"
          src="https://hwkaeeogqacgsfvbnfss.supabase.co/storage/v1/object/sign/viking_runner/grok-video-417d7c90-9f51-4e07-93c7-09cd5a9be976%20(online-video-cutter.com).mp4"
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
