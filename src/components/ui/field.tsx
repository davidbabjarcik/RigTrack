import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

const controlClass =
  'w-full rounded-lg border bg-surface px-3 text-base placeholder:text-muted-foreground disabled:opacity-50 aria-invalid:border-destructive'

type WrapperProps = {
  id: string
  label: string
  hideLabel?: boolean
  error?: string
  className?: string
  children: ReactNode
}

function FieldWrapper({ id, label, hideLabel, error, className, children }: WrapperProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm font-medium', hideLabel && 'sr-only')}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type Common = { label: string; hideLabel?: boolean; error?: string }

function useFieldProps(id: string | undefined, error: string | undefined) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return {
    fieldId,
    aria: { 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${fieldId}-error` : undefined },
  }
}

export function Field({ label, hideLabel, error, className, id, ...props }: InputHTMLAttributes<HTMLInputElement> & Common) {
  const { fieldId, aria } = useFieldProps(id, error)
  return (
    <FieldWrapper id={fieldId} label={label} hideLabel={hideLabel} error={error} className={className}>
      <input id={fieldId} className={cn(controlClass, 'h-11')} {...aria} {...props} />
    </FieldWrapper>
  )
}

export function SelectField({
  label,
  hideLabel,
  error,
  className,
  id,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & Common) {
  const { fieldId, aria } = useFieldProps(id, error)
  return (
    <FieldWrapper id={fieldId} label={label} hideLabel={hideLabel} error={error} className={className}>
      <select id={fieldId} className={cn(controlClass, 'h-11')} {...aria} {...props}>
        {children}
      </select>
    </FieldWrapper>
  )
}

export function TextareaField({
  label,
  hideLabel,
  error,
  className,
  id,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & Common) {
  const { fieldId, aria } = useFieldProps(id, error)
  return (
    <FieldWrapper id={fieldId} label={label} hideLabel={hideLabel} error={error} className={className}>
      <textarea id={fieldId} rows={4} className={cn(controlClass, 'py-2')} {...aria} {...props} />
    </FieldWrapper>
  )
}
