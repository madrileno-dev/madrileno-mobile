import Constants from 'expo-constants'
import { useColorScheme } from 'nativewind'
import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { Text } from '@/components/ui/text'

// The brand pack's mark colours; a logo, not theme tokens.
const MARK = {
  light: { m: '#1E1E24', tilde: '#B5122B' },
  dark: { m: '#F5F1EA', tilde: '#E0304A' },
}

export function BrandTitle() {
  const { colorScheme } = useColorScheme()
  const colors = MARK[colorScheme === 'dark' ? 'dark' : 'light']
  return (
    <View className="flex-row items-center gap-2" testID="brand-title">
      <Svg width={26} height={32} viewBox="14 8 72 88" accessible={false}>
        <Path
          d="M22 90 V60 a14 14 0 0 1 28 0 V90 M50 60 a14 14 0 0 1 28 0 V90"
          fill="none"
          stroke={colors.m}
          strokeWidth={9}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Path
          d="M29 24 C36 13 45 13 50 22 C55 31 64 31 71 20"
          fill="none"
          stroke={colors.tilde}
          strokeWidth={8}
          strokeLinecap="round"
        />
      </Svg>
      <Text className="text-xl font-semibold text-primary">
        {Constants.expoConfig?.name ?? 'madrileno'}
      </Text>
    </View>
  )
}
