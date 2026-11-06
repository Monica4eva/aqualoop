import { Input } from 'heroui-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Divider } from '@/components/divider';
import { HeroCard } from '@/components/hero-card';
import { Icon } from '@/components/icon';
import { Image } from '@/components/image';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { Pressable } from '@/components/pressable';
import { ART, PRODUCT_IMAGES } from '@/components/product-image';
import { ScreenHeader } from '@/components/screen-header';
import { SectionHeader } from '@/components/section-header';
import { Sheet } from '@/components/sheet';
import { Palette } from '@/constants/theme';
import { OrderRow } from '@/features/aqua/components/order-row';
import { ProductSheet } from '@/features/aqua/components/product-sheet';
import { ProductTile } from '@/features/aqua/components/product-tile';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { Category, ContainerType, Product } from '@/features/aqua/types/aqua';
import { CONTAINER_NAMES, CONTAINER_TYPES, DEPOSITS } from '@/features/aqua/utils/schedule';

const CATS: { id: Category; label: string; sf: 'drop.fill' | 'bubbles.and.sparkles.fill' | 'leaf.fill' | 'mug.fill'; ion: 'water' | 'sparkles' | 'leaf' | 'cafe' }[] = [
  { id: 'water', label: 'Water', sf: 'drop.fill', ion: 'water' },
  { id: 'sparkling', label: 'Sparkling', sf: 'bubbles.and.sparkles.fill', ion: 'sparkles' },
  { id: 'flavoured', label: 'Flavoured', sf: 'leaf.fill', ion: 'leaf' },
  { id: 'dairy', label: 'Milk', sf: 'mug.fill', ion: 'cafe' },
];

const CONTAINER_ART: Record<ContainerType, number> = { '20L_container': ART.jug, milk_bottle: ART.milkJug, crate: ART.crate };
const CONTAINER_PRODUCT: Record<ContainerType, string> = { '20L_container': 'water_20l', milk_bottle: 'milk_1l', crate: 'soda_6' };

function chunk<T>(list: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

export default function CatalogueScreen() {
  const data = useAquaStore((s) => s.data);
  const hid = useAquaStore((s) => s.householdId);
  const role = useAquaStore((s) => s.role);
  const [cat, setCat] = useState<Category>('water');
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [returnableOnly, setReturnableOnly] = useState(false);
  const [chilledOnly, setChilledOnly] = useState(false);
  const [open, setOpen] = useState<Product | null>(null);
  const cur = data.settings.currency;
  const active = data.products.filter((p) => p.active);
  const usualIds = data.standing[hid]?.lines.map((l) => l.productId) ?? [];
  const owner = role === 'owner';

  const passes = (p: Product) => (!returnableOnly || p.returnable) && (!chilledOnly || p.chilled);
  const q = query.trim().toLowerCase();
  const results = q ? active.filter((p) => passes(p) && `${p.name} ${p.short} ${p.variant ?? ''}`.toLowerCase().includes(q)) : [];
  const inCat = active.filter((p) => p.category === cat && passes(p));
  const popular = [
    ...active.filter((p) => usualIds.includes(p.id)),
    ...['water_20l', 'milk_1l', 'flav_lemon', 'soda_6'].map((id) => active.find((p) => p.id === id)).filter((p): p is Product => !!p),
  ]
    .filter((p, i, all) => all.findIndex((x) => x.id === p.id) === i)
    .slice(0, 3);
  const packs = active.filter((p) => p.pack !== 'single');
  const filters = (returnableOnly ? 1 : 0) + (chilledOnly ? 1 : 0);

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-5" keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Catalogue" subtitle="Drinks, sizes and containers" />

        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2 bg-surface rounded-full px-4 h-11">
            <Icon sf="magnifyingglass" ion="search" size={16} color="muted" />
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search drinks"
              className="flex-1 bg-transparent border-0 shadow-none px-0 h-11 text-[14px] leading-none"
              returnKeyType="search"
            />
          </View>
          <Pressable onPress={() => setFilterOpen(true)} accessibilityLabel="Filter">
            <View className={`flex-row items-center gap-1.5 h-11 px-4 rounded-full ${filters > 0 ? 'bg-accent' : 'bg-surface'}`}>
              <Icon sf="line.3.horizontal.decrease" ion="options-outline" size={15} color={filters > 0 ? 'white' : 'accent'} />
              <Text className={`text-[13px] font-semibold ${filters > 0 ? 'text-white' : 'text-accent'}`}>Filter{filters > 0 ? ` ${filters}` : ''}</Text>
            </View>
          </Pressable>
        </View>

        {q ? (
          <View className="gap-3">
            <SectionHeader title={`Results for "${query.trim()}"`} />
            <Panel pad="list">
              {results.length === 0 ? <View className="py-4"><Text className="text-[13px] text-muted">Nothing matches. Try "milk" or "lemon".</Text></View> : null}
              {results.map((p, i) => (
                <View key={p.id}>
                  {i > 0 ? <Divider inset="thumb" /> : null}
                  <OrderRow image={PRODUCT_IMAGES[p.image]} title={p.name} detail={`${cur}${p.price.toFixed(2)}`} sub={p.returnable ? 'Returnable' : p.chilled ? 'Chilled' : undefined} onPress={() => setOpen(p)} />
                </View>
              ))}
            </Panel>
          </View>
        ) : (
          <>
            <View className="flex-row gap-2">
              {CATS.map((c) => {
                const on = c.id === cat;
                return (
                  <Pressable key={c.id} onPress={() => setCat(c.id)} className="flex-1">
                    <View className={`items-center gap-1.5 py-3 rounded-xl ${on ? 'bg-accent' : 'bg-surface'}`}>
                      <Icon sf={c.sf} ion={c.ion} size={20} color={on ? 'white' : 'accent'} />
                      <Text className={`text-[11px] font-semibold ${on ? 'text-white' : 'text-foreground'}`}>{c.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <HeroCard
              eyebrow={<Chip label="Drink better" tone="accent" caps />}
              title="Pure water, a brighter day"
              body="Great taste. Less waste. Delivered to your door."
              art={ART.catalogue}
              artWidth={150}
              artRatio={1}
            >
              <PillButton label="Shop water" next onPress={() => setOpen(active.find((p) => p.id === 'water_20l') ?? null)} />
            </HeroCard>

            <View className="gap-3">
              <SectionHeader title={owner ? 'Best sellers' : 'Popular for You'} />
              <View className="flex-row gap-3">
                {popular.map((p) => (
                  <ProductTile key={p.id} product={p} currency={cur} usual={!owner && usualIds.includes(p.id)} onPress={() => setOpen(p)} onAdd={() => setOpen(p)} />
                ))}
              </View>
            </View>

            <View className="gap-3">
              <SectionHeader title={CATS.find((c) => c.id === cat)?.label ?? 'Drinks'} />
              {inCat.length === 0 ? <Panel><Text className="text-[13px] text-muted">Nothing here with those filters.</Text></Panel> : null}
              {chunk(inCat, 3).map((row, i) => (
                <View key={i} className="flex-row gap-3">
                  {row.map((p) => (
                    <ProductTile key={p.id} product={p} currency={cur} usual={!owner && usualIds.includes(p.id)} onPress={() => setOpen(p)} onAdd={() => setOpen(p)} />
                  ))}
                  {row.length < 3 ? Array.from({ length: 3 - row.length }).map((_, k) => <View key={`f${k}`} className="flex-1" />) : null}
                </View>
              ))}
            </View>

            <View className="gap-3">
              <SectionHeader title="Packs & Crates" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 pr-5" className="-mx-5 px-5">
                {packs.map((p) => (
                  <Pressable key={p.id} onPress={() => setOpen(p)}>
                    <Panel pad="tight" className="w-60">
                      <View className="flex-row items-center gap-3">
                        <View className="w-16 h-16 rounded-xl bg-sky overflow-hidden">
                          <Image source={PRODUCT_IMAGES[p.image]} className="w-full h-full" contentFit="contain" />
                        </View>
                        <View className="flex-1 gap-0.5">
                          <Text className="text-[13px] font-semibold text-foreground" numberOfLines={2}>{p.name}</Text>
                          <Text className="text-[11px] text-muted">{p.unitsPerPack} x {p.size}</Text>
                          <Text className="text-[13px] font-bold text-accent">{cur}{p.price.toFixed(2)}</Text>
                        </View>
                      </View>
                    </Panel>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View className="gap-3">
              <SectionHeader title="Returnable Containers" action="How it works" onAction={() => router.push('/how-it-works')} />
              <View className="flex-row gap-3">
                {CONTAINER_TYPES.map((t) => (
                  <Pressable key={t} className="flex-1" onPress={() => setOpen(active.find((p) => p.id === CONTAINER_PRODUCT[t]) ?? null)}>
                    <Panel pad="tight" grow>
                      <View className="h-16 items-center justify-center">
                        <Image source={CONTAINER_ART[t]} className="w-14 h-16" contentFit="contain" />
                      </View>
                      <Text className="text-[12px] font-semibold text-foreground" numberOfLines={1}>{CONTAINER_NAMES[t]}</Text>
                      <Text className="text-[13px] font-bold text-accent">{cur}{DEPOSITS[t]} deposit</Text>
                      <Text className="text-[10px] text-muted">One-time, back when returned</Text>
                    </Panel>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <ProductSheet product={open} onClose={() => setOpen(null)} />

      <Sheet visible={filterOpen} onClose={() => setFilterOpen(false)} title="Filter" subtitle="Narrow the catalogue">
        <Panel>
          <View className="flex-row items-center justify-between">
            <Text className="text-[14px] text-foreground">Returnable only</Text>
            <Switch value={returnableOnly} onValueChange={setReturnableOnly} trackColor={{ true: Palette.accent }} />
          </View>
          <Divider />
          <View className="flex-row items-center justify-between">
            <Text className="text-[14px] text-foreground">Chilled only</Text>
            <Switch value={chilledOnly} onValueChange={setChilledOnly} trackColor={{ true: Palette.accent }} />
          </View>
        </Panel>
        <PillButton label="Show drinks" grow onPress={() => setFilterOpen(false)} />
      </Sheet>
    </View>
  );
}
