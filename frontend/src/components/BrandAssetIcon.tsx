type BrandAssetIconProps = {
  alt: string
  className?: string
  size?: number
  src: string
}

function BrandAssetIcon({ alt, className, size = 40, src }: BrandAssetIconProps) {
  return (
    <img
      alt={alt}
      aria-hidden="true"
      className={className}
      height={size}
      src={src}
      width={size}
    />
  )
}

export default BrandAssetIcon
