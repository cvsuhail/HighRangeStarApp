"use client";

import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import React, { useState } from "react";

export default function ResetPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      await sendPasswordReset(email.trim());
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      setError(err?.message || "Failed to send reset email");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5" />
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Reset password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email to receive a password reset link.
            </p>
          </div>
          <div>
            <form onSubmit={onSubmit}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {message && <p className="text-sm text-success-600">{message}</p>}
                {error && <p className="text-sm text-error-500">{error}</p>}
                <div className="flex items-center gap-3">
                  <Button size="sm" type="submit" disabled={submitting}>
                    {submitting ? "Sending..." : "Send reset link"}
                  </Button>
                  <Link href="/signin" className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400">
                    Back to Sign in
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


