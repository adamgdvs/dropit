interface ProgressBarProps {
  progress: number;
  label?: string;
  className?: string;
}

export default function ProgressBar({ progress, label, className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  return (
    <div
      className={`w-full h-1.5 bg-outline overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || `Transfer progress: ${clamped}%`}
    >
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
