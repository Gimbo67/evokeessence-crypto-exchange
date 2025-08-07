import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'default' | 'card' | 'text' | 'avatar';
  size?: 'sm' | 'md' | 'lg';
}

function Skeleton({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: SkeletonProps) {
  const baseStyles = "animate-pulse rounded-md bg-muted";

  const variantStyles = {
    default: "",
    card: "w-full h-full min-h-[200px]",
    text: "h-4",
    avatar: "rounded-full"
  };

  const sizeStyles = {
    sm: variant === 'avatar' ? 'w-8 h-8' : 'w-16',
    md: variant === 'avatar' ? 'w-12 h-12' : 'w-24',
    lg: variant === 'avatar' ? 'w-16 h-16' : 'w-32'
  };

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
      role="status"
      aria-label="Loading..."
      aria-busy="true"
    />
  )
}

export { Skeleton }