'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  pendingText?: string
  formAction?: (formData: FormData) => void
}

/**
 * Form submit button that automatically disables itself and shows a spinner
 * while the server action is pending. Prevents double-click / double-submit.
 */
export function SubmitButton({
  children,
  pendingText,
  className,
  formAction,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      formAction={formAction}
      disabled={pending}
      className={className}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {pendingText ?? '処理中...'}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
