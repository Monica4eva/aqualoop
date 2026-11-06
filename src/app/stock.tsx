import { ScrollView, Text, View } from 'react-native';

import { BackHeader } from '@/components/back-header';
import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { Panel } from '@/components/panel';
import { PRODUCT_IMAGES } from '@/components/product-image';
import { SectionHeader } from '@/components/section-header';
import { OrderRow } from '@/features/aqua/components/order-row';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import { dateKey, fmtLongDay, keyToMs } from '@/features/aqua/utils/dates';
import { productById, reservedOf } from '@/features/aqua/utils/schedule';

export default function StockScreen() {
  const data = useAquaStore((s) => s.data);
  const today = dateKey(data.clock);
  const batches = [...data.milkBatches].sort((a, b) => a.useBy.localeCompare(b.useBy));

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader title="Stock" subtitle="On hand, booked over the next 7 days, and free to sell" />

      <View className="gap-3">
        <SectionHeader title="Milk batches" />
        <Panel pad="list">
          {batches.length === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">No milk in the chiller.</Text></View> : null}
          {batches.map((b, i) => {
            const days = Math.round((keyToMs(b.useBy) - keyToMs(today)) / 86_400_000);
            const expired = days < 0;
            const soon = !expired && days <= 2;
            const p = productById(data, b.productId);
            return (
              <View key={b.id}>
                {i > 0 ? <Divider /> : null}
                <View className="flex-row items-center justify-between gap-3 py-3">
                  <View className="flex-1 gap-0.5">
                    <Text className="text-[13px] font-semibold text-foreground">{b.qty} x {p?.short ?? b.productId}</Text>
                    <Text className={`text-[12px] ${expired ? 'text-danger font-semibold' : soon ? 'text-amber font-semibold' : 'text-muted'}`}>
                      Use by {fmtLongDay(b.useBy)} • batch {b.id}
                    </Text>
                  </View>
                  {expired ? <Chip label="Expired" tone="danger" /> : soon ? <Chip label={days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'}`} tone="warning" /> : <Chip label={`${days} days`} tone="success" />}
                </View>
              </View>
            );
          })}
        </Panel>
      </View>

      <View className="gap-3">
        <SectionHeader title="All products" />
        <Panel pad="list">
          {data.products.map((p, i) => {
            const booked = reservedOf(data, p.id);
            const free = p.onHand - booked;
            const low = free <= p.reorderLevel;
            return (
              <View key={p.id}>
                {i > 0 ? <Divider inset="thumb" /> : null}
                <OrderRow
                  image={PRODUCT_IMAGES[p.image]}
                  title={p.name}
                  detail={`${p.onHand} on hand • ${booked} booked`}
                  sub={`${free} free to sell • reorder at ${p.reorderLevel}`}
                  badge={free < 0 ? <Chip label="Short" tone="danger" /> : low ? <Chip label="Low" tone="warning" /> : null}
                />
              </View>
            );
          })}
        </Panel>
        <Text className="text-[11px] text-faint">Restock a product from its card in the Catalogue.</Text>
      </View>
    </ScrollView>
  );
}
