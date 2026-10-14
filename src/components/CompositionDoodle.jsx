import React from 'react';

export function CompositionDoodle({ analysis, visible }) {
  if (!analysis || !visible) return null;

  const lines = Array.isArray(analysis.lines) ? analysis.lines : [];
  const focalPoints = Array.isArray(analysis.focalPoints) ? analysis.focalPoints : [];

  if (lines.length === 0 && focalPoints.length === 0) return null;

  return (
    <div className="doodle-overlay" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="doodle-svg">
        {lines.map((line, index) => (
          <line
            key={`line-${index}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            className="doodle-hairline"
          />
        ))}

        {focalPoints.map((focal, index) => (
          <circle
            key={`focal-${index}`}
            cx={focal.x}
            cy={focal.y}
            r="1.2"
            className="doodle-hairline-anchor"
          />
        ))}
      </svg>
    </div>
  );
}
