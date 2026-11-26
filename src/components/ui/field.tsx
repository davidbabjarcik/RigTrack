import { Eye, EyeOff } from 'lucide-react'
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { tx } from '@/lib/i18n'
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

/** Heslo s ikonou oka – zobrazí alebo skryje napísané heslo (len v tomto políčku, nikam sa neposiela). */
export function PasswordField({ label, hideLabel, error, className, id, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & Common) {
  const { fieldId, aria } = useFieldProps(id, error)
  const [visible, setVisible] = useState(false)
  return (
    <FieldWrapper id={fieldId} label={label} hideLabel={hideLabel} error={error} className={className}>
      <div className="relative">
        <input id={fieldId} type={visible ? 'text' : 'password'} className={cn(controlClass, 'h-11 pr-11')} autoCapitalize="none" autoCorrect="off" spellCheck={false} {...aria} {...props} />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? tx('Skryť heslo') : tx('Zobraziť heslo')}
          aria-pressed={visible}
          aria-controls={fieldId}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
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
}: SelectHTMLAttributes<HTMLSelectElement> & Common & { ref?: Ref<HTMLSelectElement> }) {
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
