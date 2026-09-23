import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'
import { View } from 'react-native'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

const FieldContext = createContext<{ error: string | null }>({ error: null })

interface FieldProps {
  error?: string
  className?: string
  children: ReactNode
}

export function Field({ error, className, children }: FieldProps) {
  return (
    <FieldContext.Provider value={{ error: error ?? null }}>
      <View className={cn('gap-1.5', className)}>{children}</View>
    </FieldContext.Provider>
  )
}

export function useFieldError(): string | null {
  return useContext(FieldContext).error
}

// Screen readers read the hint after the label, so the error is heard on focus.
export function FieldInput(props: ComponentProps<typeof Input>) {
  const error = useFieldError()
  return <Input {...props} accessibilityHint={error ?? props.accessibilityHint} />
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text variant="small">{children}</Text>
}

export function FieldError() {
  const error = useFieldError()
  if (error === null) return null
  return (
    <Text
      testID="field-error"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="text-destructive text-sm"
    >
      {error}
    </Text>
  )
}
