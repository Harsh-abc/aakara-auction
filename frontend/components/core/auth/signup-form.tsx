import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  return (
    <form className={cn("flex flex-col gap-6 w-full", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-[34px] font-semibold text-text-secondary">Create Account</h1>
        </div>
        <div className="flex items-center gap-2">
          <Field>
            <Input
              id="name"
              type="text"
              placeholder="First Name"
              required
              className="bg-background"
            />
          </Field>
          <Field>
            <Input
              id="name"
              type="text"
              placeholder="Last Name"
              required
              className="bg-background"
            />
          </Field>
        </div>
        <Field>

          <Input
            id="email"
            type="email"
            placeholder="Email"
            required
            className="bg-background"
          />
        </Field>
        <Field>

          <Input
            id="password"
            type="password"
            placeholder="Password"
            required
            className="bg-background"
          />
        </Field>
        <Field>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Confirm Password"
            required
            className="bg-background"
          />
        </Field>
        <Field>
          <Button type="submit">Create Account</Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
