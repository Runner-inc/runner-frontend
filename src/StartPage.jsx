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
const vikingRef = useRef(null);
const animationFrameRef = useRef(null);
const skeletonAnimationRef = useRef(null);
const skeletonSpawnIntervalRef = useRef(null);
const velocityRef = useRef(0);
const jumpTimeoutRef = useRef(null);
const vikingPositionRef = useRef(vikingPosition);
const isJumpingRef = useRef(isJumping);
const gravity = 0.8;


useEffect(() => {
vikingPositionRef.current = vikingPosition;
}, [vikingPosition]);


useEffect(() => {
isJumpingRef.current = isJumping;
}, [isJumping]);


const getFloorY = () => window.innerHeight - 150; // виртуальная земля


useEffect(() => {
if (gameStarted && !vikingReachedBottom && !gameOver) {
const animate = () => {
setVikingPosition(prev => {
let newTop = prev.top + velocityRef.current;
velocityRef.current += gravity;
const floorY = getFloorY();


if (newTop + 75 >= floorY) {
newTop = floorY - 75;
setVikingReachedBottom(true);
velocityRef.current = 0;
}


return { ...prev, top: newTop };
});


if (!vikingReachedBottom && !gameOver) {
animationFrameRef.current = requestAnimationFrame(animate);
}
};


animationFrameRef.current = requestAnimationFrame(animate);
}


return () => {
if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current);
};
}, [gameStarted, vikingReachedBottom, gameOver]);


const checkCollision = (vikingPos, skeletonList, jumping) => {
const s = 75;
export default StartPage;