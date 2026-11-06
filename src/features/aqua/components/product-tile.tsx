import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Image } from '@/components/image';
import { Panel } from '@/components/panel';
import { Pressable } from '@/components/pressable';
import { PRODUCT_IMAGES } from '@/components/product-image';
import type { Product } from '@/features/aqua/types/aqua';

type ProductTileProps = {
  product: Product;
  currency: string;
  usual?: boolean;
  onPress: () => void;
  onAdd: () => void;
};

/** A "Popular for You" tile: picture, tag, + button, name, price, returnable mark. */
export function ProductTile({ product, currency, usual, onPress, onAdd }: ProductTileProps) {
  return (
    <Pressable onPress={onPress} className="flex-1">
      <Panel pad="tight" grow>
        <View className="h-24 rounded-xl bg-sky items-center justify-center overflow-hidden">
          <Image source={PRODUCT_IMAGES[product.image]} className="w-full h-full" contentFit="contain" />
          {usual ? (
            <View className="absolute top-1.5 left-1.5 bg-accent rounded-full px-2 py-0.5">
              <Text className="text-[9px] font-bold text-white">Your usual</Text>
            </View>
          ) : null}
        </View>
        <View className="gap-0.5">
          <Text className="text-[12px] font-semibold text-foreground" numberOfLines={2}>{product.name}</Text>
          <View className="flex-row items-center justify-between gap-1">
            <Text className="text-[13px] font-bold text-accent">{currency}{product.price.toFixed(2)}</Text>
            <Pressable onPress={onAdd} accessibilityLabel={`Add ${product.name}`} hitSlop={6}>
              <View className="w-7 h-7 rounded-full bg-accent items-center justify-center">
                <Icon sf="plus" ion="add" size={14} color="white" />
              </View>
            </Pressable>
          </View>
          {product.returnable ? (
            <View className="flex-row items-center gap-1">
              <Icon sf="arrow.triangle.2.circlepath" ion="repeat" size={10} color="lagoon" />
              <Text className="text-[10px] text-lagoon">Returnable</Text>
            </View>
          ) : product.chilled ? (
            <Text className="text-[10px] text-muted">Chilled</Text>
          ) : (
            <Text className="text-[10px] text-muted">{product.size}{product.pack !== 'single' ? ` • ${product.pack}` : ''}</Text>
          )}
        </View>
      </Panel>
    </Pressable>
  );
}
