import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { cn } from '@/lib/utils'

interface ScreenProps {
  children: ReactNode
  scroll?: boolean
  form?: boolean
  className?: string
}

// Safe-area aware screen body. The Stack header owns the top inset; this pads
// bottom and sides. `form` adds keyboard avoidance for screens with inputs.
export function Screen({ children, scroll = false, form = false, className }: ScreenProps) {
  const insets = useSafeAreaInsets()
  const padding = {
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  }
  const body = scroll ? (
    <ScrollView
      contentContainerClassName={cn('p-4 gap-4', className)}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1 p-4 gap-4', className)}>{children}</View>
  )
  const inner = form ? (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  )
  return (
    <View className="flex-1 bg-background" style={padding}>
      {inner}
    </View>
  )
}
