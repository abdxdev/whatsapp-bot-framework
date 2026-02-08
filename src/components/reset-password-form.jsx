"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function ResetPasswordForm({ className, ...props }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if there's a valid session from the email link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidToken(true);
      } else {
        setError("Invalid or expired reset link");
      }
    });
  }, [supabase.auth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Password updated successfully
      router.push("/dashboard");
      router.refresh();
    }
  };

  if (!isValidToken && !error) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-2xl font-bold">Loading...</h1>
        <p className="text-muted-foreground text-sm">Verifying your reset link...</p>
      </div>
    );
  }

  if (error && !isValidToken) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <h1 className="text-2xl font-bold">Invalid Link</h1>
        <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</p>
        <Button onClick={() => router.push("/login")}>Back to Login</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-muted-foreground text-sm text-balance">Enter your new password below</p>
        </div>
        <Field>
          <FieldLabel htmlFor="password">New Password</FieldLabel>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter new password" />
          <FieldDescription>Must be at least 6 characters long.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input id="confirm-password" type="password" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
          <FieldDescription>Please re-enter your password.</FieldDescription>
        </Field>
        {error && isValidToken && <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md">{error}</div>}
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating Password..." : "Update Password"}
          </Button>
        </Field>
        <FieldDescription className="text-center">
          Remember your password?{" "}
          <a href="/login" className="underline underline-offset-4">
            Sign in
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
