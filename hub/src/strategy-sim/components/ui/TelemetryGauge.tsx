import React from 'react';

interface TelemetryGaugeProps {
  value: number;
  max?: number;
  min?: number;
  title: string;
  unit?: string;
  size?: number;
  thresholds?: {
    warning: number;
    danger: number;
    invert?: boolean; // If true, low is good, high is bad (e.g. dampness)
  };
  customColor?: string;
}

export const TelemetryGauge: React.FC<TelemetryGaugeProps> = ({
  value,
  max = 100,
  min = 0,
  title,
  unit = '%',
  size = 140,
  thresholds = { warning: 50, danger: 25, invert: false },
  customColor,
}) => {
  const normalizedValue = Math.min(max, Math.max(min, value));
  const percentage = (normalizedValue - min) / (max - min);

  // SVG parameters
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  // Arc angle: 260 degrees arc for a speedo feel
  const arcLength = circumference * 0.72;
  const strokeDashoffset = arcLength * (1 - percentage);

  // Determine dynamic color
  let color = '#00d2be'; // Cyan / Green default
  if (customColor) {
    color = customColor;
  } else if (!thresholds.invert) {
    // Normal: High is good, low is bad (Tires, Reliability, Confidence)
    if (value <= thresholds.danger) {
      color = '#e10600'; // F1 Red
    } else if (value <= thresholds.warning) {
      color = '#ff8700'; // Papaya Orange
    } else {
      color = '#00d2be'; // Mercedes Teal
    }
  } else {
    // Inverted: Low is good, high is dangerous (Track dampness)
    if (value >= thresholds.danger) {
      color = '#e10600';
    } else if (value >= thresholds.warning) {
      color = '#ff8700';
    } else {
      color = '#38bdf8'; // Sky Blue
    }
  }

  const isAlert = !thresholds.invert ? value <= thresholds.danger : value >= thresholds.danger;

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 relative overflow-hidden transition-all duration-300 hover:border-white/20">
      {isAlert && (
        <div className="absolute inset-0 bg-red-600/10 pointer-events-none animate-pulse rounded-xl" />
      )}
      <div className="relative" style={{ width: size, height: size * 0.85 }}>
        <svg
          width={size}
          height={size}
          className="transform rotate-[140deg] overflow-visible"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Active progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease',
              filter: `drop-shadow(0 0 6px ${color}80)`,
            }}
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <div className="text-2xl font-teko font-bold tracking-wider text-white leading-none">
            {typeof value === 'number' ? (value % 1 === 0 ? value : value.toFixed(1)) : value}
            <span className="text-xs font-inter text-gray-400 ml-0.5">{unit}</span>
          </div>
          <div className="text-[10px] font-inter font-semibold uppercase tracking-widest text-gray-400 mt-0.5 max-w-[90px] truncate text-center">
            {title}
          </div>
        </div>
      </div>
    </div>
  );
};
