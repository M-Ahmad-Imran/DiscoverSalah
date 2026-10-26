import { useApp } from '../../hooks/useApp';
export function MosqueArt({
  index = 0,
  className = '',
}: {
  index?: number;
  className?: string;
}) {
  useApp();
  return (
    <div className={`mosque-art art-${index} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 260" role="presentation">
        <defs>
          <linearGradient id={'sky' + index} x2="0" y2="1">
            <stop stopColor={index === 1 ? '#d7e7df' : '#e5efea'} />
            <stop offset="1" stopColor="#b4cbbd" />
          </linearGradient>
        </defs>
        <rect width="400" height="260" fill={`url(#sky${index})`} />
        <circle cx="310" cy="55" r="28" fill="#f8f5df" />
        <path d="M0 215Q80 180 140 215T280 205T400 200V260H0Z" fill="#91ad9a" />
        <path d="M90 235V119h220v116" fill="#f0eee1" />
        <path d="M132 120Q132 87 200 48Q268 87 268 120Z" fill="#236c52" />
        <path d="M195 50V32h10v18" fill="#236c52" />
        <path d="M48 235V87h26v148M326 235V87h26v148" fill="#e8e5d5" />
        <path d="M43 87l18-28 18 28M321 87l18-28 18 28" fill="#236c52" />
        <path
          d="M174 235v-53q26-45 52 0v53M111 185v-26q13-22 26 0v26M263 185v-26q13-22 26 0v26"
          fill="#235741"
        />
        <path d="M0 235h400v25H0" fill="#c9c8b9" />
        <path d="M145 260l29-25h52l29 25" fill="#e5e3d8" />
        <path
          d="M15 235V173m-12 13q12-38 24 0m347 49v-60m-12 14q12-38 24 0"
          stroke="#557e61"
          strokeWidth="13"
          fill="none"
        />
      </svg>
    </div>
  );
}
