import { zodResolver } from '@hookform/resolvers/zod'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner-native'
import { useTranslations } from 'use-intl'
import { z } from 'zod'
import { problemFrom } from '@/api/problem'
import { Field, FieldError, FieldInput, FieldLabel } from '@/components/Field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'
import { usePriceFormatter } from '@/features/auctions/format'
import { usePlaceBid, type Auction } from '@/features/auctions/queries'
import { useRejectionMessage } from '@/features/auctions/rejection'

export function PlaceBidDialog({ auction }: { auction: Auction }) {
  const t = useTranslations('auction')
  const [open, setOpen] = useState(false)
  const [rejection, setRejection] = useState<string | null>(null)
  const price = usePriceFormatter()
  const rejectionMessage = useRejectionMessage()
  const placeBid = usePlaceBid(auction.id)
  // zod 4 infers `unknown` as the input of z.coerce.number(); the <string>
  // argument declares the wire input so the form field and resolver agree.
  const bidSchema = z.object({
    amount: z.coerce.number<string>().positive(t('bidAmountPositive')),
  })
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof bidSchema>, unknown, z.output<typeof bidSchema>>({
    resolver: zodResolver(bidSchema),
    defaultValues: { amount: '' },
  })

  const onSubmit = handleSubmit(({ amount }) => {
    setRejection(null)
    placeBid.mutate(
      { params: { auctionId: auction.id }, body: { amount } },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          reset()
          setOpen(false)
          toast.success(t('bidPlaced'))
        },
        onError: (error) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          const problem = problemFrom(error)
          setRejection(problem ? rejectionMessage(problem) : t('bidFailed'))
        },
      },
    )
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button testID="bid-open" disabled={auction.status !== 'Open'}>
          <Text>{t('bidOpen')}</Text>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('bidDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('bidDialogBody', { price: price(auction.currentPrice, auction.currency) })}
          </DialogDescription>
        </DialogHeader>
        <Field error={errors.amount?.message}>
          <FieldLabel>{t('bidAmountLabel', { currency: auction.currency })}</FieldLabel>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, onBlur, value } }) => (
              <FieldInput
                testID="bid-amount"
                keyboardType="decimal-pad"
                placeholder={String(auction.currentPrice)}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          <FieldError />
        </Field>
        {rejection !== null && (
          <Text className="text-destructive" testID="bid-rejection">
            {rejection}
          </Text>
        )}
        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onPress={() => setOpen(false)}>
            <Text>{t('bidCancel')}</Text>
          </Button>
          <Button testID="bid-submit" onPress={() => void onSubmit()} disabled={placeBid.isPending}>
            <Text>{placeBid.isPending ? t('bidPlacing') : t('bidPlace')}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
