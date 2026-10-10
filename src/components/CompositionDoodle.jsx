import React from 'react';

export function CompositionDoodle({ analysis, visible }) {
  if (!analysis || !visible) return null;

  const { rule, lines, focalPoints } = analysis;

  const renderDoodles = () => {
    switch (rule) {
      case 'Rule of Thirds':
        return (
          <g className="doodle-grid" opacity="0.4">
            <line x1="33.33" y1="0" x2="33.33" y2="100" stroke="var(--accent)" strokeWidth="0.2" strokeDasharray="1 1" />
            <line x1="66.66" y1="0" x2="66.66" y2="100" stroke="var(--accent)" strokeWidth="0.2" strokeDasharray="1 1" />
            <line x1="0" y1="33.33" x2="100" y2="33.33" stroke="var(--accent)" strokeWidth="0.2" strokeDasharray="1 1" />
            <line x1="0" y1="66.66" x2="100" y2="66.66" stroke="var(--accent)" strokeWidth="0.2" strokeDasharray="1 1" />
          </g>
        );
      case 'Golden Triangle':
        return (
          <g className="doodle-grid" opacity="0.4">
            <line x1="0" y1="0" x2="100" y2="100" stroke="var(--accent)" strokeWidth="0.2" strokeDasharray="1 1" />
            <line x1="0" y1="100" x2="66.6" y2="66.6" stroke="var(--accent)" strokeWidth="0.2" strokeDasharray="1 1" />
            <line x1="100" y1="0" x2="33.3" y2="33.3" stroke="var(--accent)" strokeWidth="0.2" strokeDasharray="1 1" />
          </g>
        );
      case 'Half and Half':
        return (
          <g className="doodle-grid" opacity="0.4">
            {lines && lines[0] ? (
              <line x1={lines[0].x1} y1={lines[0].y1} x2={lines[0].x2} y2={lines[0].y2} stroke="var(--accent)" strokeWidth="0.2" strokeDasharray="1 1" />
            ) : (
              <line x1="0" y1="50" x2="100" y2="50" stroke="var(--accent)" strokeWidth="0.2" strokeDasharray="1 1" />
            )}
          </g>
        );
      default:
        // Render dynamic lines and focal points
        return (
          <>
            {lines?.map((line, idx) => (
              <g key={`line-${idx}`} className="doodle-line-group" filter="url(#neon-glow)">
                <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className="doodle-path" />
                {line.label && (
                  <text x={(line.x1 + line.x2) / 2} y={(line.y1 + line.y2) / 2 - 2} className="doodle-label">
                    {line.label}
                  </text>
                )}
              </g>
            ))}
          </>
        );
    }
  };

  return (
    <div className="doodle-overlay">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="doodle-svg">
        <defs>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {renderDoodles()}

        {focalPoints?.map((focal, idx) => (
          <g key={`focal-${idx}`} className="doodle-focal-group" filter="url(#neon-glow)">
            <circle cx={focal.x} cy={focal.y} r="3" className="doodle-target-outer" />
            <circle cx={focal.x} cy={focal.y} r="0.5" className="doodle-target-inner" />
            <line x1={focal.x - 4} y1={focal.y} x2={focal.x + 4} y2={focal.y} className="doodle-crosshair" />
            <line x1={focal.x} y1={focal.y - 4} x2={focal.x} y2={focal.y + 4} className="doodle-crosshair" />
          </g>
        ))}
        
        {/* Draw brutalist tag for the rule */}
        <g filter="url(#neon-glow)">
            <rect x="2" y="90" width="30" height="6" fill="#000" opacity="0.8" />
            <text x="3" y="94.5" fill="var(--accent)" fontFamily="'Space Grotesk', monospace" fontSize="3" fontWeight="bold" letterSpacing="0.2">
              [ {rule?.toUpperCase() || 'COMPOSITION'} ]
            </text>
        </g>
      </svg>
    </div>
  );
}
