export function BrandLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <img
      src="/favicon.png"
      alt=""
      className={`${className} rounded-lg object-contain flex-shrink-0`}
    />
  );
}
