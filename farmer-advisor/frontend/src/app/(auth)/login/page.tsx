"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/TextField";
import { api, ApiError } from "@/lib/api";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await api.login(email.trim(), password);
      signIn(user);
      router.replace("/today");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not sign in. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to see how your farm is doing today.">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error ? (
          <p role="alert" className="rounded-xl bg-cherry-soft px-4 py-3 font-semibold text-cherry">
            {error}
          </p>
        ) : null}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email || !password}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-muted">
        New here?{" "}
        <Link href="/register" className="font-semibold text-leaf underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthFrame>
  );
}
