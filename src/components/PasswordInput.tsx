import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  showStrength?: boolean;
  disabled?: boolean;
}

const requirements = [
  { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  { label: "1 uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "1 lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
  { label: "1 digit", test: (pw: string) => /[0-9]/.test(pw) },
  { label: "1 special character", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
];

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "Enter your password",
  required,
  minLength,
  showStrength = false,
  disabled,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const passedRequirements = requirements.filter((req) => req.test(value)).length;
  const strengthPercentage = (passedRequirements / requirements.length) * 100;

  const getStrengthColor = () => {
    if (strengthPercentage <= 20) return "bg-destructive";
    if (strengthPercentage <= 40) return "bg-orange-500";
    if (strengthPercentage <= 60) return "bg-yellow-500";
    if (strengthPercentage <= 80) return "bg-lime-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (strengthPercentage <= 20) return "Very Weak";
    if (strengthPercentage <= 40) return "Weak";
    if (strengthPercentage <= 60) return "Fair";
    if (strengthPercentage <= 80) return "Good";
    return "Strong";
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={value.length === 0 ? placeholder : undefined}
          required={required}
          minLength={minLength}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all", getStrengthColor())}
                style={{ width: `${strengthPercentage}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {getStrengthLabel()}
            </span>
          </div>
          <ul className="space-y-1">
            {requirements.map((req, index) => {
              const passed = req.test(value);
              return (
                <li
                  key={index}
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    passed ? "text-green-600" : "text-muted-foreground"
                  )}
                >
                  {passed ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {req.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
