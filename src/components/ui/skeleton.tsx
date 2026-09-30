import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'

function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View>) {
  const opacity = useSharedValue(1)
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    )
  }, [opacity])
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return (
    <Animated.View style={style}>
      <View className={cn('bg-accent rounded-md', className)} {...props} />
    </Animated.View>
  )
}

export { Skeleton }
