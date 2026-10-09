import { render, screen } from '@testing-library/react-native'
import { Controller, useForm } from 'react-hook-form'
import { Field, FieldError, FieldInput, FieldLabel } from '@/components/Field'

function EmailField({ error }: { error?: string }) {
  const { control } = useForm<{ email: string }>({ defaultValues: { email: '' } })
  return (
    <Field error={error}>
      <FieldLabel>Email</FieldLabel>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FieldInput testID="email" value={field.value} onChangeText={field.onChange} />
        )}
      />
      <FieldError />
    </Field>
  )
}

describe('Field', () => {
  it('announces the error: hint on the control, alert text below it', async () => {
    await render(<EmailField error="Required" />)
    expect(screen.getByText('Email')).toBeTruthy()
    expect(screen.getByTestId('email').props.accessibilityHint).toBe('Required')
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })

  it('renders no hint and no error slot when valid', async () => {
    await render(<EmailField />)
    expect(screen.getByTestId('email').props.accessibilityHint).toBeUndefined()
    expect(screen.queryByTestId('field-error')).toBeNull()
  })
})
