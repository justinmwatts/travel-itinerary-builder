// Copyright (c) 2026 Justin Watts. All rights reserved.
// Proprietary and confidential. Unauthorized copying, distribution, or use of
// this file, via any medium, is strictly prohibited without prior written permission.
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Field, Heading, Input, Stack, Tabs, Text } from "@chakra-ui/react";
import { z } from "zod";
import { loginRequestSchema, signupRequestSchema } from "@travel/shared";
import { ApiError } from "../../lib/apiClient";
import { useLogin, useMe, useSignup } from "./api";

type FieldErrors = Record<string, string | undefined>;

function firstFieldErrors(error: z.ZodError): FieldErrors {
  const flat = error.flatten().fieldErrors;
  const out: FieldErrors = {};
  for (const [key, messages] of Object.entries(flat)) {
    out[key] = messages?.[0];
  }
  return out;
}

interface TextFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
}

function TextField({ label, type = "text", value, onChange, error, autoComplete }: TextFieldProps) {
  return (
    <Field.Root invalid={Boolean(error)}>
      <Field.Label>{label}</Field.Label>
      <Input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        bg="bg.surface"
        borderColor="border"
      />
      {error ? <Field.ErrorText>{error}</Field.ErrorText> : null}
    </Field.Root>
  );
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const banner = login.error instanceof ApiError ? login.error.message : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(firstFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    login.mutate(parsed.data, { onSuccess: onDone });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="4">
        {banner ? (
          <Box
            bg="paper"
            borderWidth="1px"
            borderColor="danger"
            color="danger"
            px="3"
            py="2"
            rounded="sm"
          >
            <Text textStyle="small">{banner}</Text>
          </Box>
        ) : null}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          autoComplete="email"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="current-password"
        />
        <Button
          type="submit"
          bg="ink"
          color="paper"
          loading={login.isPending}
          loadingText="Signing in"
        >
          Continue
        </Button>
      </Stack>
    </form>
  );
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const signup = useSignup();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // A duplicate email is a field-level error; anything else is a banner.
  const emailTaken = signup.error instanceof ApiError && signup.error.status === 409;
  const banner = signup.error instanceof ApiError && !emailTaken ? signup.error.message : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupRequestSchema.safeParse({ email, password, displayName });
    if (!parsed.success) {
      setErrors(firstFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    signup.mutate(parsed.data, { onSuccess: onDone });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="4">
        {banner ? (
          <Box
            bg="paper"
            borderWidth="1px"
            borderColor="danger"
            color="danger"
            px="3"
            py="2"
            rounded="sm"
          >
            <Text textStyle="small">{banner}</Text>
          </Box>
        ) : null}
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email ?? (emailTaken ? "That email is already registered" : undefined)}
          autoComplete="email"
        />
        <TextField
          label="Display name"
          value={displayName}
          onChange={setDisplayName}
          error={errors.displayName}
          autoComplete="nickname"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="new-password"
        />
        <Button
          type="submit"
          bg="ink"
          color="paper"
          loading={signup.isPending}
          loadingText="Creating account"
        >
          Continue
        </Button>
      </Stack>
    </form>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me, isPending } = useMe();
  const [tab, setTab] = useState<"login" | "signup">("login");

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
  const goBack = () => navigate(from, { replace: true });

  // Already signed in: skip the form.
  if (!isPending && me) {
    return <Navigate to={from} replace />;
  }

  return (
    <Box maxW="420px" mx="auto" mt="12" px="4">
      <Box bg="bg.surface" borderWidth="1px" borderColor="border" rounded="lg" p="8">
        <Heading textStyle="display-md" textAlign="center" mb="1">
          TravelItineraryBuilder
        </Heading>
        <Text textStyle="small" color="fg.muted" textAlign="center" mb="6">
          Build and share trips you have actually thought through.
        </Text>

        <Tabs.Root value={tab} onValueChange={(e) => setTab(e.value as "login" | "signup")} fitted>
          <Tabs.List mb="6">
            <Tabs.Trigger value="login">Log in</Tabs.Trigger>
            <Tabs.Trigger value="signup">Sign up</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="login">
            <LoginForm onDone={goBack} />
          </Tabs.Content>
          <Tabs.Content value="signup">
            <SignupForm onDone={goBack} />
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  );
}
