// Simple confetti effect for React
export function showConfetti() {
  const duration = 1.2 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }
  const interval = setInterval(function() {
    if (window.confetti) {
      window.confetti({
        ...defaults,
        particleCount: 40,
        origin: {
          x: randomInRange(0.2, 0.8),
          y: Math.random() - 0.2
        }
      });
    }
    if (Date.now() > animationEnd) {
      clearInterval(interval);
    }
  }, 250);
}
