"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/TextField";
import { api, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordError = password.length > 0 && password.length < 8 ? "Use at least 8 characters." : null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return;
    setError(null);
    setLoading(true);
    try {
      const user = await api.register(email.trim(), password, name.trim());
      signIn(user);
      router.replace("/farm?welcome=1");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not create your account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthFrame title="Create your account" subtitle="It takes a minute. Next, you will mark your farm on the map.">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error ? (
          <p role="alert" className="rounded-xl bg-cherry-soft px-4 py-3 font-semibold text-cherry">
            {error}
          </p>
        ) : null}
        <TextField
          label="Your name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          hint="Optional"
        />
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
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="At least 8 characters"
          error={passwordError}
        />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email || password.length < 8}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-leaf underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
