export function BrandLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      className={`${className} rounded-lg object-contain flex-shrink-0`}
    />
  );
}
