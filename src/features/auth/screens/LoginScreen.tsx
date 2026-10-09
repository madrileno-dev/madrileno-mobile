import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { z } from 'zod'
import { client } from '@/api/orpc'
import { problemFrom, type Problem } from '@/api/problem'
import { Field, FieldError, FieldInput, FieldLabel } from '@/components/Field'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { tokenStore } from '@/features/auth/tokenStore'

interface LoginForm {
  email: string
}

export function LoginScreen() {
  const t = useTranslations('login')
  const [problem, setProblem] = useState<Problem | null>(null)
  const loginSchema = z.object({ email: z.email(t('emailInvalid')) })
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '' } })

  const onSubmit = handleSubmit(async ({ email }) => {
    setProblem(null)
    try {
      const res = await client.v1.auth.dev.post({ body: { email } })
      // (auth)/_layout navigates once the token store changes.
      tokenStore.set({ jwt: res.jwt, refreshToken: res.refreshToken, email })
    } catch (error) {
      setProblem(problemFrom(error) ?? { type: 'unknown', status: 0, title: t('failed') })
    }
  })

  return (
    <Screen form className="justify-center">
      <View className="gap-2">
        <Text variant="h3">{t('heading')}</Text>
        <Text variant="muted">{t('hint')}</Text>
      </View>
      <Field error={errors.email?.message}>
        <FieldLabel>{t('emailLabel')}</FieldLabel>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <FieldInput
              testID="login-email"
              accessibilityLabel={t('emailLabel')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        <FieldError />
      </Field>
      {problem !== null && <Text className="text-destructive">{problem.title}</Text>}
      <Button testID="login-submit" onPress={() => void onSubmit()} disabled={isSubmitting}>
        <Text>{isSubmitting ? t('submitting') : t('submit')}</Text>
      </Button>
    </Screen>
  )
}
