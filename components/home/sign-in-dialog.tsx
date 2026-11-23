"use client"

import * as React from "react"
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react"

import { authClient, signInWithSocial, type SocialProvider } from "@/lib/auth-client"
import { useAuthDialog } from "@/components/providers/auth-dialog-provider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Button } from "@/components/ui/button"

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true" {...props}>
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  )
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function SocialButtons({ disabled }: { disabled?: boolean }) {
  const [loadingProvider, setLoadingProvider] = React.useState<SocialProvider | null>(null)

  function handleClick(provider: SocialProvider) {
    setLoadingProvider(provider)
    signInWithSocial(provider)
  }

  const isBusy = disabled || loadingProvider !== null

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isBusy}
        onClick={() => handleClick("google")}
      >
        {loadingProvider === "google" ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isBusy}
        onClick={() => handleClick("github")}
      >
        {loadingProvider === "github" ? <Loader2 className="animate-spin" /> : <GithubIcon />}
        Continue with GitHub
      </Button>
    </div>
  )
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(mode: "sign-in" | "sign-up", name: string, email: string, password: string) {
  if (mode === "sign-up" && !name.trim()) {
    return "Please enter your name."
  }
  if (!email.trim() || !EMAIL_PATTERN.test(email.trim())) {
    return "Please enter a valid email address."
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters."
  }
  return null
}

function AuthForm({
  mode,
  onAuthenticated,
}: {
  mode: "sign-in" | "sign-up"
  onAuthenticated: () => void
}) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationError = validate(mode, name, email, password)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const { error: authError } =
        mode === "sign-in"
          ? await authClient.signIn.email({ email: email.trim(), password })
          : await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })

      if (authError) {
        setError(authError.message ?? "Something went wrong. Please try again.")
        return
      }

      onAuthenticated()
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        {mode === "sign-up" && (
          <Field>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
            />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor={`email-${mode}`}>Email</FieldLabel>
          <Input
            id={`email-${mode}`}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`password-${mode}`}>Password</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={`password-${mode}`}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              disabled={isLoading}
              required
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-xs"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={isLoading}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="animate-spin" />}
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  )
}

export function SignInDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { socialError, clearSocialError } = useAuthDialog()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) clearSocialError()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle>Welcome to AppForge</DialogTitle>
          <DialogDescription>
            Sign in to save your projects and pick up where you left off.
          </DialogDescription>
        </DialogHeader>

        {socialError && (
          <p role="alert" className="text-center text-sm text-destructive">
            {socialError}
          </p>
        )}

        <SocialButtons />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or continue with email
          <div className="h-px flex-1 bg-border" />
        </div>

        <Tabs defaultValue="sign-in">
          <TabsList className="w-full">
            <TabsTrigger value="sign-in" className="flex-1">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="sign-up" className="flex-1">
              Sign up
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in" className="pt-4">
            <AuthForm mode="sign-in" onAuthenticated={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="sign-up" className="pt-4">
            <AuthForm mode="sign-up" onAuthenticated={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
