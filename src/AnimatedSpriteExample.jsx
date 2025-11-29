import React from 'react';
import AnimatedSprite from './AnimatedSprite';
import './AnimatedSpriteExample.css';

function AnimatedSpriteExample() {
  // Example: Array of image paths
  // Replace these with your actual image paths
  // Images should be placed in the public folder or imported
  const runnerFrames = [
    '/images/runner-frame1.png',
    '/images/runner-frame2.png',
    '/images/runner-frame3.png',
    '/images/runner-frame4.png',
  ];

  // Alternative: Using placeholder images or imported images
  // You can also import images like:
  // import frame1 from './assets/runner1.png';
  // import frame2 from './assets/runner2.png';
  // const runnerFrames = [frame1, frame2, frame3, frame4];

  return (
    <div className="animated-sprite-example">
      <h2>Animated Sprite Example</h2>
      
      {/* Example 1: Runner animation */}
      <div className="example-container">
        <h3>Runner Animation</h3>
        <AnimatedSprite
          images={runnerFrames}
          frameDuration={150}
          alt="Running character"
          width="200px"
          height="200px"
        />
      </div>

      {/* Example 2: Faster animation */}
      <div className="example-container">
        <h3>Fast Animation</h3>
        <AnimatedSprite
          images={runnerFrames}
          frameDuration={50}
          alt="Fast running character"
          width="200px"
          height="200px"
        />
      </div>

      {/* Example 3: Custom size */}
      <div className="example-container">
        <h3>Large Size</h3>
        <AnimatedSprite
          images={runnerFrames}
          frameDuration={100}
          alt="Large character"
          width="400px"
          height="400px"
        />
      </div>
    </div>
  );
}

export default AnimatedSpriteExample;

