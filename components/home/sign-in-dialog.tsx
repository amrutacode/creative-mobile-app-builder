"use client"

import * as React from "react"
import { Loader2, Sparkles } from "lucide-react"

import { authClient } from "@/lib/auth-client"
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
import { Button } from "@/components/ui/button"

function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error: authError } =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name, email, password })

    setIsLoading(false)
    if (authError) {
      setError(authError.message ?? "Something went wrong. Please try again.")
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {mode === "sign-up" && (
          <Field>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`password-${mode}`}>Password</FieldLabel>
          <Input
            id={`password-${mode}`}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <AuthForm mode="sign-in" />
          </TabsContent>
          <TabsContent value="sign-up" className="pt-4">
            <AuthForm mode="sign-up" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
