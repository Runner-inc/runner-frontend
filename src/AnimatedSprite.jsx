import React, { useState, useEffect } from 'react';
import './AnimatedSprite.css';

function AnimatedSprite({ 
  images = [], 
  frameDuration = 100, 
  className = '',
  alt = 'animated sprite',
  width,
  height
}) {
  const [currentFrame, setCurrentFrame] = useState(0);

  useEffect(() => {
    if (images.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame((prevFrame) => (prevFrame + 1) % images.length);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [images.length, frameDuration]);

  if (images.length === 0) {
    return null;
  }

  return (
    <div className={`animated-sprite-container ${className}`}>
      <img
        src={images[currentFrame]}
        alt={alt}
        className="animated-sprite"
        style={{
          width: width || 'auto',
          height: height || 'auto'
        }}
      />
    </div>
  );
}

export default AnimatedSprite;

