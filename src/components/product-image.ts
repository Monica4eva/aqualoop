import type { ImageSourcePropType } from 'react-native';

import type { ImageKey } from '@/features/aqua/types/aqua';

export const PRODUCT_IMAGES: Record<ImageKey, ImageSourcePropType> = {
  water20: require('@/assets/images/art/jug-20l.png'),
  water5: require('@/assets/images/products/water-5l.jpg'),
  soda: require('@/assets/images/products/soda-1l.jpg'),
  tonic: require('@/assets/images/products/tonic-1l.jpg'),
  lemon: require('@/assets/images/products/flavoured-lemon.jpg'),
  berry: require('@/assets/images/products/flavoured-berry.jpg'),
  cucumber: require('@/assets/images/products/flavoured-cucumber.jpg'),
  milk1: require('@/assets/images/products/milk-1l.jpg'),
  milk2: require('@/assets/images/products/milk-2l.jpg'),
};

export const ART = {
  home: require('@/assets/images/art/mascot-home.png'),
  catalogue: require('@/assets/images/art/mascot-catalogue.png'),
  deliveries: require('@/assets/images/art/mascot-deliveries.png'),
  containers: require('@/assets/images/art/mascot-containers.png'),
  jug: require('@/assets/images/art/jug-20l.png'),
  milkJug: require('@/assets/images/art/milk-jug.png'),
  crate: require('@/assets/images/art/crate.png'),
} as const;
