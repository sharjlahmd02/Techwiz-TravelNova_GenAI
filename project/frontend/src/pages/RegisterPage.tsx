import { AlertCircle, Check, Eye, EyeOff, X } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import type { TokenResponse, User } from "../types/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function TextureBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] [-webkit-mask-image:radial-gradient(ellipse_65%_55%_at_50%_35%,black,transparent)] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_35%,black,transparent)]"
      style={{
        backgroundImage:
          "radial-gradient(circle, #0A0A0A 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
  );
}

function LogoLockup() {
  return (
    <div className="flex items-center justify-center">
      <img
        src="/logo.png"
        alt="SupportNova"
        width={133}
        height={48}
        className="h-8 w-auto object-contain sm:h-9"
      />
    </div>
  );
}

function Checkbox({
  id,
  checked,
  onChange,
  invalid,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  invalid?: boolean;
  label: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer select-none items-start gap-2"
    >
      <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`h-4 w-4 rounded-[4px] border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0A0A0A] ${
            checked
              ? "border-[#0A0A0A] bg-[#0A0A0A]"
              : invalid
                ? "border-[#DC2626] ring-2 ring-[#DC2626]/15"
                : "border-zinc-300 bg-white"
          }`}
        />
        <Check
          className={`pointer-events-none absolute h-3 w-3 text-white transition-opacity ${checked ? "opacity-100" : "opacity-0"}`}
          strokeWidth={3}
        />
      </span>
      <span className="text-sm text-zinc-600">{label}</span>
    </label>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-[#0A0A0A]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-10 w-full rounded-lg border bg-white px-3.5 pr-11 text-sm text-[#0A0A0A] placeholder:text-zinc-400 transition-all duration-150 focus:outline-none ${
            error
              ? "border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.10)]"
              : "border-zinc-200 focus:border-[#0A0A0A] focus:shadow-[0_0_0_3px_rgba(10,10,10,0.08)]"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
        >
          {visible ? (
            <EyeOff className="h-[18px] w-[18px]" />
          ) : (
            <Eye className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 flex items-start gap-1 text-xs text-[#DC2626]"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function passwordStrength(password: string): {
  score: 1 | 2 | 3;
  label: string;
  color: string;
} {
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const long = password.length >= 8;

  if (long && hasNumber && hasUpper)
    return { score: 3, label: "Strong", color: "#16A34A" };
  if (long && (hasNumber || hasUpper))
    return { score: 2, label: "Fair", color: "#CA8A04" };
  return { score: 1, label: "Weak", color: "#DC2626" };
}

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [termsTouched, setTermsTouched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const strength = useMemo(
    () => (password ? passwordStrength(password) : null),
    [password],
  );

  const validateFullName = (value: string): string | undefined => {
    if (!value.trim()) return "Full name is required.";
    if (value.trim().length < 2) return "Enter your full name.";
    return undefined;
  };

  const validateEmailFormat = (value: string): string | undefined => {
    if (!value.trim()) return "Email is required.";
    if (!EMAIL_RE.test(value)) return "Enter a valid email address.";
    return undefined;
  };

  const validatePasswordValue = (value: string): string | undefined => {
    if (!value) return "Password is required.";
    if (value.length < 8) return "Password must be at least 8 characters.";
    return undefined;
  };

  const validateConfirm = (
    value: string,
    against: string,
  ): string | undefined => {
    if (!value) return "Confirm your password.";
    if (value !== against) return "Passwords don't match.";
    return undefined;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setTermsTouched(true);

    const nextErrors: FieldErrors = {
      fullName: validateFullName(fullName),
      email: validateEmailFormat(email),
      password: validatePasswordValue(password),
      confirmPassword: validateConfirm(confirmPassword, password),
    };
    setErrors(nextErrors);

    if (nextErrors.fullName) {
      fullNameRef.current?.focus();
      return;
    }
    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }
    if (nextErrors.password || nextErrors.confirmPassword || !agreedToTerms)
      return;

    setLoading(true);
    try {
      await api.post<User>("/api/auth/register", {
        full_name: fullName,
        email,
        password,
      });
      const loginResponse = await api.post<TokenResponse>("/api/auth/login", {
        email,
        password,
      });
      setSession(loginResponse.data);
      navigate("/customer/dashboard");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        "Something went wrong creating your account. Please try again.";
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#FAFAFA] px-4 py-3">
      <TextureBackground />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] sm:p-6">
          <LogoLockup />

          <div className="mt-3 text-center">
            <h1 className="text-[22px] font-bold tracking-tight text-[#0A0A0A]">
              Create your account
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Get faster, transparent resolutions for your travel complaints
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              className="relative mt-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 pr-9 text-sm text-[#DC2626]"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {serverError}
              </div>
              <button
                type="button"
                onClick={() => setServerError(null)}
                aria-label="Dismiss"
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-[#DC2626]/60 hover:text-[#DC2626]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <form
            className="mt-4 flex flex-col gap-2.5"
            onSubmit={handleSubmit}
            noValidate
          >
            <div>
              <label
                htmlFor="full_name"
                className="mb-1 block text-sm font-medium text-[#0A0A0A]"
              >
                Full name
              </label>
              <input
                id="full_name"
                ref={fullNameRef}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    fullName: validateFullName(fullName),
                  }))
                }
                placeholder="Ahmed Khan"
                autoComplete="name"
                aria-invalid={!!errors.fullName}
                aria-describedby={
                  errors.fullName ? "full_name-error" : undefined
                }
                className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-[#0A0A0A] placeholder:text-zinc-400 transition-all duration-150 focus:outline-none ${
                  errors.fullName
                    ? "border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.10)]"
                    : "border-zinc-200 focus:border-[#0A0A0A] focus:shadow-[0_0_0_3px_rgba(10,10,10,0.08)]"
                }`}
              />
              {errors.fullName && (
                <p
                  id="full_name-error"
                  role="alert"
                  className="mt-1 flex items-start gap-1 text-xs text-[#DC2626]"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-[#0A0A0A]"
              >
                Email
              </label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    email: validateEmailFormat(email),
                  }))
                }
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-[#0A0A0A] placeholder:text-zinc-400 transition-all duration-150 focus:outline-none ${
                  errors.email
                    ? "border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.10)]"
                    : "border-zinc-200 focus:border-[#0A0A0A] focus:shadow-[0_0_0_3px_rgba(10,10,10,0.08)]"
                }`}
              />
              {errors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-1 flex items-start gap-1 text-xs text-[#DC2626]"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              <div>
                <PasswordField
                  id="password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      password: validatePasswordValue(password),
                    }))
                  }
                  error={errors.password}
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
                {!errors.password && strength && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-colors"
                          style={{
                            backgroundColor:
                              i <= strength.score ? strength.color : "#E4E4E7",
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{ color: strength.color }}
                    >
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              <PasswordField
                id="confirm_password"
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                onBlur={() =>
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: validateConfirm(confirmPassword, password),
                  }))
                }
                error={errors.confirmPassword}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>

            <div>
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onChange={(v) => {
                  setAgreedToTerms(v);
                  if (v) setTermsTouched(false);
                }}
                invalid={termsTouched && !agreedToTerms}
                label={
                  <>
                    I agree to the{" "}
                    <a href="#" className="text-[#000] hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-[#000] hover:underline">
                      Privacy Policy
                    </a>
                  </>
                }
              />
              {termsTouched && !agreedToTerms && (
                <p role="alert" className="ml-6 mt-1 text-xs text-[#DC2626]">
                  You must accept the terms to continue.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-10 w-full items-center justify-center rounded-full bg-[#0A0A0A] text-sm font-semibold text-white transition-all duration-150 hover:bg-[#27272A] active:scale-[0.98] active:duration-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
            >
              {loading ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="my-3 flex items-center">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="mx-3 text-xs text-zinc-400">or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-[#000] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-3 text-center text-xs text-zinc-400">
          © 2026 TravelNova. All rights reserved. &nbsp;·&nbsp;{" "}
          <a href="#" className="hover:text-zinc-600 hover:underline">
            Terms
          </a>{" "}
          ·{" "}
          <a href="#" className="hover:text-zinc-600 hover:underline">
            Privacy
          </a>
        </p>
      </div>
    </div>
  );
}
