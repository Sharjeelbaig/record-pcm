type RecordPcmLogoProps = {
  size?: number
  variant?: 'icon' | 'lockup'
}

const BRAND_BLUE = '#005ac1'
const BRAND_BLUE_SOFT = '#d9e6ff'
const BRAND_SLATE = '#43536b'

function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 64 64"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill={BRAND_BLUE_SOFT} height="52" rx="18" width="52" x="6" y="6" />
      <rect fill={BRAND_BLUE} height="24" rx="8" width="18" x="23" y="14" />
      <rect fill={BRAND_SLATE} height="14" rx="3" width="4" x="30" y="36" />
      <rect fill={BRAND_SLATE} height="4" rx="2" width="18" x="23" y="47" />
      <rect fill={BRAND_SLATE} height="12" rx="2" width="4" x="15" y="21" />
      <rect fill={BRAND_BLUE} height="18" rx="2" width="4" x="9" y="18" />
      <rect fill={BRAND_SLATE} height="12" rx="2" width="4" x="45" y="21" />
      <rect fill={BRAND_BLUE} height="18" rx="2" width="4" x="51" y="18" />
      <path
        d="M18 26c0 8 6.3 14 14 14s14-6 14-14"
        fill="none"
        stroke={BRAND_SLATE}
        strokeLinecap="round"
        strokeWidth="3"
      />
      <circle cx="32" cy="22" fill="#ffffff" opacity="0.28" r="4.2" />
    </svg>
  )
}

function RecordPcmLogo({ size = 44, variant = 'lockup' }: RecordPcmLogoProps) {
  if (variant === 'icon') {
    return (
      <span className="record-pcm-logo record-pcm-logo--icon">
        <LogoMark size={size} />
      </span>
    )
  }

  return (
    <span className="record-pcm-logo record-pcm-logo--lockup">
      <LogoMark size={size} />
      <span className="record-pcm-logo__copy">
        <span className="record-pcm-logo__title">record-pcm</span>
        <span className="record-pcm-logo__subtitle">Browser PCM recorder</span>
      </span>
    </span>
  )
}

export default RecordPcmLogo
