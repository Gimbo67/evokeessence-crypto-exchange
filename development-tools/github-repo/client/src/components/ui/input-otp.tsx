import * as React from "react"
import { cn } from "@/lib/utils"

export interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
}

export const InputOTP: React.FC<OTPInputProps> = ({ 
  value, 
  onChange, 
  maxLength = 6,
  className
}) => {
  // This is now a container component that manages state
  return (
    <div className={cn("w-full", className)}>
      <input 
        type="hidden" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
InputOTP.displayName = "InputOTP";

interface InputOTPGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const InputOTPGroup: React.FC<InputOTPGroupProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
    </div>
  );
};
InputOTPGroup.displayName = "InputOTPGroup";

interface InputOTPSlotProps {
  index: number;
  onValueChange: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export const InputOTPSlot: React.FC<InputOTPSlotProps> = ({ 
  index, 
  onValueChange, 
  className,
  children
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (inputRef.current?.value) {
        inputRef.current.value = "";
        onValueChange("");
      } else {
        const prev = inputRef.current?.parentElement?.previousElementSibling?.querySelector('input');
        if (prev instanceof HTMLInputElement) {
          prev.focus();
          prev.value = "";
          onValueChange("");
        }
      }
    }
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    // Only keep the last entered digit
    const digit = value.replace(/[^0-9]/g, "").slice(-1);

    // Update input value
    target.value = digit;

    if (digit) {
      onValueChange(digit);

      const next = target.parentElement?.nextElementSibling?.querySelector('input');
      if (next instanceof HTMLInputElement) {
        next.focus();
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const numbers = pastedData.replace(/[^0-9]/g, '').split('');

    if (numbers.length > 0) {
      // Set current input
      if (inputRef.current) {
        inputRef.current.value = numbers[0];
        onValueChange(numbers[0]);
      }

      // Fill subsequent inputs
      let parent = inputRef.current?.parentElement;
      for (let i = 1; i < numbers.length && parent; i++) {
        parent = parent.nextElementSibling;
        if (parent) {
          const input = parent.querySelector('input') as HTMLInputElement | null;
          if (input) {
            input.value = numbers[i];
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
          }
        }
      }
    }
  };

  React.useEffect(() => {
    if (index === 0) {
      inputRef.current?.focus();
    }
  }, [index]);

  return (
    <div
      className={cn(
        "relative flex h-12 w-12 items-center justify-center rounded-md border-2 border-input bg-background text-base font-semibold transition-all",
        "focus-within:z-10 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:border-primary",
        className
      )}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="\d*"
        maxLength={1}
        className="absolute inset-0 w-full h-full text-center bg-transparent border-none focus:outline-none"
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        onFocus={handleFocus}
        onPaste={handlePaste}
        autoComplete="off"
      />
      <div className="pointer-events-none select-none">
        {children}
      </div>
    </div>
  );
};
InputOTPSlot.displayName = "InputOTPSlot";