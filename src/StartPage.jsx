import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./StartPage.css";
import AnimatedSprite from "./AnimatedSprite";
import { start_viking, viking_run, viking_jump, skeleton, valkyrie } from "./vikingSprites";

function StartPage() {
  const navigate = useNavigate();

  const [gameStarted, setGameStarted] = useState(false);
  const [vPos, setVPos] = useState({ top: 300, left: 100 });
  const [jumping, setJumping] = useState(false);

  const [skeletonData, setSkeletonData] = useState(null);
  const [valkyrieData, setValkyrieData] = useState(null);

  const velocityRef = useRef(0);
  const gravity = 8;
  const jumpPower = -55;

  const gameLoop = useRef(null);

  // --------------------------------------------------------
  // Collision system
  // --------------------------------------------------------
  const checkCollision = () => {
    if (!skeletonData && !valkyrieData) return false;

    const spriteSize = 75;
    const hit = 45;
    const pad = (spriteSize - hit) / 2;

    const vTop = vPos.top + pad + (jumping ? -120 : 0);
    const vLeft = vPos.left + pad;
    const vRight = vLeft + hit;
    const vBottom = vTop + hit;

    const A = { left: vLeft, right: vRight, top: vTop, bottom: vBottom };

    const overlap = (A, B) =>
      A.left < B.right && A.right > B.left && A.top < B.bottom && A.bottom > B.top;

    // check skeleton
    if (skeletonData) {
      const sLeft = skeletonData.left + pad;
      const sTop = skeletonData.top + pad;
      const B = {
        left: sLeft,
        right: sLeft + hit,
        top: sTop,
        bottom: sTop + hit,
      };
      if (overlap(A, B)) return true;
    }

    // check valkyrie
    if (valkyrieData) {
      const eLeft = valkyrieData.left + pad;
      const eTop = valkyrieData.top + pad;
      const B = {
        left: eLeft,
        right: eLeft + hit,
        top: eTop,
        bottom: eTop + hit,
      };
      if (overlap(A, B)) return true;
    }

    return false;
  };

  // --------------------------------------------------------
  // Start the game
  // --------------------------------------------------------
  const startGame = () => {
    setGameStarted(true);
    setVPos({ top: 300, left: 100 });
    velocityRef.current = 0;

    spawnSkeleton();
    spawnValkyrie();
  };

  // --------------------------------------------------------
  // Jump control (NO holding allowed)
  // --------------------------------------------------------
  const handleJump = () => {
    if (jumping) return;

    setJumping(true);
    velocityRef.current = jumpPower;
  };

  // --------------------------------------------------------
  // Skeleton spawn (only ONE)
  // --------------------------------------------------------
  const spawnSkeleton = () => {
    if (skeletonData) return;

    setSkeletonData({
      left: 900,
      top: 300,
      speed: 7,
    });
  };

  // --------------------------------------------------------
  // Valkyrie spawn (one at a time)
  // --------------------------------------------------------
  const spawnValkyrie = () => {
    if (valkyrieData) return;

    const delay = Math.random() * 3000 + 3000; // every 3–6s

    setTimeout(() => {
      setValkyrieData({
        left: 900,
        top: 180, // flight height = Viking jump height
        speed: 10,
      });
    }, delay);
  };

  // --------------------------------------------------------
  // Main game loop
  // --------------------------------------------------------
  useEffect(() => {
    if (!gameStarted) return;

    gameLoop.current = setInterval(() => {
      // Jump physics
      if (jumping) {
        velocityRef.current += gravity;
        setVPos((prev) => {
          let newTop = prev.top + velocityRef.current;
          if (newTop >= 300) {
            newTop = 300;
            setJumping(false);
            velocityRef.current = 0;
          }
          return { ...prev, top: newTop };
        });
      }

      // Move skeleton
      setSkeletonData((prev) => {
        if (!prev) return null;
        const newLeft = prev.left - prev.speed;
        if (newLeft < -100) {
          setTimeout(spawnSkeleton, 800);
          return null;
        }
        return { ...prev, left: newLeft };
      });

      // Move valkyrie
      setValkyrieData((prev) => {
        if (!prev) return null;
        const newLeft = prev.left - prev.speed;
        if (newLeft < -150) {
          spawnValkyrie();
          return null;
        }
        return { ...prev, left: newLeft };
      });

      // Check collisions
      if (checkCollision()) {
        clearInterval(gameLoop.current);
        alert("Game Over");
        setGameStarted(false);
      }
    }, 30);

    return () => clearInterval(gameLoop.current);
  }, [gameStarted]);

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------
  return (
    <div className="game-container" onClick={handleJump}>
      {!gameStarted && (
        <button className="start-button" onClick={startGame}>
          Start
        </button>
      )}

      {gameStarted && (
        <>
          {/* Viking */}
          <AnimatedSprite
            sprites={jumping ? viking_jump : viking_run}
            top={vPos.top}
            left={vPos.left}
          />

          {/* Skeleton */}
          {skeletonData && (
            <AnimatedSprite
              sprites={skeleton}
              top={skeletonData.top}
              left={skeletonData.left}
            />
          )}

          {/* Valkyrie */}
          {valkyrieData && (
            <AnimatedSprite
              sprites={valkyrie}
              top={valkyrieData.top}
              left={valkyrieData.left}
            />
          )}
        </>
      )}
    </div>
  );
}

export default StartPage;
