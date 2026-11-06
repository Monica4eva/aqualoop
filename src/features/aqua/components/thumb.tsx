import type { ImageSourcePropType } from 'react-native';
import { View } from 'react-native';

import { Image } from '@/components/image';

type ThumbProps = {
  source: ImageSourcePropType;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'round' | 'soft';
};

const SIZE = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-16 h-16' } as const;

/** Product picture on its pale-blue disc, as in the design's list rows. */
export function Thumb({ source, size = 'md', shape = 'round' }: ThumbProps) {
  return (
    <View className={`${SIZE[size]} ${shape === 'round' ? 'rounded-full' : 'rounded-2xl'} bg-sky items-center justify-center overflow-hidden`}>
      <Image source={source} className="w-4/5 h-4/5" contentFit="contain" />
    </View>
  );
}
