function BrandWordmark({ inverse = false, className = '' }) {
  return (
    <span className={`brand-wordmark ${inverse ? 'brand-wordmark-inverse' : ''} ${className}`.trim()}>
      e-Visit<span className="brand-wordmark-accent">BRI</span>
    </span>
  )
}

export default BrandWordmark