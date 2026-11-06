import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Image } from '@/components/image';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { PRODUCT_IMAGES } from '@/components/product-image';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { Stepper } from '@/components/stepper';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { Product } from '@/features/aqua/types/aqua';
import { availableOf, DEPOSITS, reservedOf } from '@/features/aqua/utils/schedule';

type ProductSheetProps = { product: Product | null; onClose: () => void };

const ROUTE_TEXT: Record<string, string> = {
  confirmed: 'Added. You can see it in Deliveries.',
  owner: "Thanks, we've got your message. We'll confirm shortly.",
  duplicate: 'You just asked for that, so we kept the first one.',
};

export function ProductSheet({ product, onClose }: ProductSheetProps) {
  const data = useAquaStore((s) => s.data);
  const role = useAquaStore((s) => s.role);
  const shopAdd = useAquaStore((s) => s.shopAdd);
  const updateProduct = useAquaStore((s) => s.updateProduct);
  const restock = useAquaStore((s) => s.restock);
  const [qty, setQty] = useState(1);
  const [scope, setScope] = useState<'next' | 'every'>('next');
  const [added, setAdded] = useState<string | null>(null);
  const [stockIn, setStockIn] = useState(6);
  const live = product ? (data.products.find((p) => p.id === product.id) ?? product) : null;
  const close = () => {
    setQty(1);
    setAdded(null);
    onClose();
  };
  if (!live) return null;
  const cur = data.settings.currency;
  const owner = role === 'owner';
  const free = availableOf(data, live.id);

  return (
    <Sheet visible={product !== null} onClose={close} title={live.name} subtitle={`${cur}${live.price.toFixed(2)}${live.pack !== 'single' ? ` • ${live.unitsPerPack} x ${live.size}` : ''}`}>
      <View className="h-44 rounded-3xl bg-sky items-center justify-center overflow-hidden">
        <Image source={PRODUCT_IMAGES[live.image]} className="w-full h-full" contentFit="contain" />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {live.returnable && live.container ? <Chip label={`Returnable • ${cur}${DEPOSITS[live.container]} deposit`} tone="success" /> : null}
        {live.chilled ? <Chip label="Chilled" tone="accent" /> : null}
        <Chip label={`Up to ${live.maxPerOrder} per order`} tone="muted" />
      </View>

      {owner ? (
        <View className="gap-4">
          <Panel>
            <View className="flex-row justify-between">
              <Text className="text-[13px] text-muted">On hand</Text>
              <Text className={`text-[13px] font-semibold ${live.onHand <= live.reorderLevel ? 'text-amber' : 'text-foreground'}`}>{live.onHand}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[13px] text-muted">Booked this week</Text>
              <Text className="text-[13px] font-semibold text-foreground">{reservedOf(data, live.id)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[13px] text-muted">Free to sell</Text>
              <Text className={`text-[13px] font-semibold ${free < 0 ? 'text-danger' : 'text-foreground'}`}>{free}</Text>
            </View>
          </Panel>
          <Panel>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-semibold text-foreground">Price</Text>
              <Stepper value={live.price} step={0.1} min={0.1} max={99} size="sm" format={(n) => `${cur}${n.toFixed(2)}`} onChange={(n) => updateProduct(live.id, { price: n })} />
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[13px] font-semibold text-foreground">Restock</Text>
              <Stepper value={stockIn} min={1} max={200} size="sm" onChange={setStockIn} />
            </View>
            <PillButton label={`Add ${stockIn} to stock`} grow onPress={() => {
              restock(live.id, stockIn);
              Alert.alert('Stock updated', `${stockIn} x ${live.short} added${live.chilled ? ' as a new batch, use by in 7 days' : ''}.`);
            }} />
          </Panel>
        </View>
      ) : added ? (
        <Panel tone={added === 'confirmed' ? 'lagoon' : 'sky'}>
          <Text className="text-[14px] font-semibold text-foreground">{added === 'confirmed' ? 'Done' : 'Got it'}</Text>
          <Text className="text-[13px] text-foreground/80">{ROUTE_TEXT[added] ?? ROUTE_TEXT.owner}</Text>
          <PillButton label="Close" variant="soft" onPress={close} />
        </Panel>
      ) : (
        <View className="gap-4">
          <Panel>
            <View className="flex-row items-center justify-between">
              <Text className="text-[14px] font-semibold text-foreground">How many</Text>
              <Stepper value={qty} min={1} max={live.maxPerOrder} onChange={setQty} />
            </View>
            <Segmented values={['next', 'every'] as const} labels={['Next delivery', 'Every delivery']} value={scope} onChange={setScope} />
          </Panel>
          <PillButton
            label={`Add ${qty} • ${cur}${(qty * live.price).toFixed(2)}`}
            grow
            disabled={role !== 'customer'}
            onPress={() => setAdded(shopAdd(live, qty, scope === 'every'))}
          />
          {role === 'customer' ? null : <Text className="text-[11px] text-muted text-center">Only customers can order.</Text>}
        </View>
      )}
    </Sheet>
  );
}
