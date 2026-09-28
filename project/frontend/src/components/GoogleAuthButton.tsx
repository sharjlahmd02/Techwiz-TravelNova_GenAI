import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import type { TokenResponse } from "../types/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as
  | string
  | undefined;

interface GoogleAuthButtonProps {
  onError?: (message: string) => void;
  // Optional: override where to go after success (e.g. role-based redirect on the Login page)
  onSuccess?: (data: TokenResponse) => void;
}

export function GoogleAuthButton({ onError, onSuccess }: GoogleAuthButtonProps) {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(320);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wrapRef.current) {
      setWidth(
        Math.min(400, Math.max(200, Math.floor(wrapRef.current.clientWidth))),
      );
    }
  }, []);

  // If the client ID isn't configured, render nothing so the page still works.
  if (!GOOGLE_CLIENT_ID) return null;

  const handleCredential = async (credential?: string) => {
    if (!credential) {
      onError?.("Google sign-in failed. Please try again.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post<TokenResponse>("/api/auth/google", {
        credential,
      });
      setSession(res.data);
      if (onSuccess) onSuccess(res.data);
      else navigate("/customer/dashboard");
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Google sign-in failed. Please try again.";
      onError?.(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div
        ref={wrapRef}
        className={`flex justify-center ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <GoogleLogin
          onSuccess={(res) => handleCredential(res.credential)}
          onError={() => onError?.("Google sign-in was cancelled or failed.")}
          text="continue_with"
          shape="pill"
          theme="outline"
          size="large"
          width={width}
        />
      </div>
    </GoogleOAuthProvider>
  );
}