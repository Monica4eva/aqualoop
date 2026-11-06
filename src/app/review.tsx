import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Input } from 'heroui-native';

import { BackHeader } from '@/components/back-header';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Panel } from '@/components/panel';
import { PillButton } from '@/components/pill-button';
import { Segmented } from '@/components/segmented';
import { Sheet } from '@/components/sheet';
import { Stepper } from '@/components/stepper';
import { UnderstoodCard } from '@/features/aqua/components/understood-card';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { Line, ReviewItem, RunSlot } from '@/features/aqua/types/aqua';
import { addDays, dateKey, fmtDay, fmtStamp } from '@/features/aqua/utils/dates';
import { HOLDING_REPLY } from '@/features/aqua/utils/engine';

const STATUS = { approved: 'Approved', edited: 'Edited & approved', rejected: 'Replied & closed', waiting: 'Waiting' } as const;

export default function ReviewScreen() {
  const data = useAquaStore((s) => s.data);
  const approve = useAquaStore((s) => s.approveReview);
  const editApprove = useAquaStore((s) => s.editApprove);
  const reject = useAquaStore((s) => s.rejectReview);
  const [tab, setTab] = useState<'waiting' | 'done'>('waiting');
  const [editing, setEditing] = useState<ReviewItem | null>(null);
  const [replying, setReplying] = useState<ReviewItem | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [date, setDate] = useState('');
  const [run, setRun] = useState<RunSlot>('morning');
  const [reply, setReply] = useState('');

  const list = data.reviews.filter((r) => (tab === 'waiting' ? r.status === 'waiting' : r.status !== 'waiting'));
  const days = Array.from({ length: 6 }, (_, i) => addDays(dateKey(data.clock), i + 1)).filter((d) => new Date(`${d}T00:00:00Z`).getUTCDay() !== 0);
  const canApprove = (r: ReviewItem) => r.householdId !== null && !['unclear'].includes(r.result.parsed.intent) && r.result.parsed.language === 'en';

  const openEdit = (r: ReviewItem) => {
    const base = r.result.resolution.lines.length > 0 ? r.result.resolution.lines : (data.standing[r.householdId ?? '']?.lines ?? []);
    setLines(base.map((l) => ({ ...l })));
    setDate(r.result.resolution.date ?? days[0] ?? '');
    setRun(r.result.resolution.run);
    setEditing(r);
  };
  const setQty = (pid: string, qty: number) => {
    const has = lines.some((l) => l.productId === pid);
    setLines(has ? lines.map((l) => (l.productId === pid ? { ...l, qty } : l)) : [...lines, { productId: pid, qty }]);
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-4 gap-5">
      <BackHeader title="Owner checks" subtitle="Messages the app didn't act on by itself" />
      <Segmented values={['waiting', 'done'] as const} labels={[`Waiting (${data.reviews.filter((r) => r.status === 'waiting').length})`, 'Done']} value={tab} onChange={setTab} />
      {list.length === 0 ? (
        <Panel>
          <View className="items-center gap-2 py-4">
            <Icon sf="checkmark.seal.fill" ion="checkmark-done-circle" size={28} color="lagoon" />
            <Text className="text-[14px] font-semibold text-foreground">{tab === 'waiting' ? 'All caught up' : 'Nothing checked yet'}</Text>
            <Text className="text-[12px] text-muted text-center">{tab === 'waiting' ? 'New messages that need a person land here.' : 'Approved and closed messages show here.'}</Text>
          </View>
        </Panel>
      ) : null}
      {list.map((r) => {
        const h = data.households.find((x) => x.id === r.householdId);
        return (
          <Panel key={r.id}>
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1 gap-0.5">
                <Text className="text-[14px] font-semibold text-foreground">{h?.label ?? 'Unknown number'}</Text>
                <Text className="text-[11px] text-muted">{r.phone} • {fmtStamp(r.at, data.clock)}</Text>
              </View>
              {r.status === 'waiting' ? <Chip label="Waiting" tone="warning" /> : <Chip label={STATUS[r.status]} tone={r.status === 'rejected' ? 'muted' : 'success'} />}
            </View>
            <View className="rounded-xl bg-sky px-3 py-2.5 gap-1">
              {r.channel === 'voice' ? (
                <View className="flex-row items-center gap-1.5">
                  <Icon sf="waveform" ion="mic" size={12} />
                  <Text className="text-[11px] font-semibold text-accent">Voice note transcript</Text>
                </View>
              ) : null}
              <Text className="text-[13px] text-foreground">"{r.text}"</Text>
              {r.channel === 'voice' ? <Text className="text-[10px] text-muted">{r.status === 'waiting' ? 'Audio is deleted once this is checked.' : 'Audio deleted after review.'}</Text> : null}
            </View>
            <UnderstoodCard result={r.result} detailed />
            {r.status === 'waiting' ? (
              <View className="gap-2">
                <Text className="text-[11px] text-muted">Customer was told: "{HOLDING_REPLY}"</Text>
                <View className="flex-row gap-2">
                  {canApprove(r) ? <PillButton size="sm" label="Approve" onPress={() => approve(r.id)} grow /> : null}
                  {r.householdId ? <PillButton size="sm" variant="soft" label="Edit" onPress={() => openEdit(r)} grow /> : null}
                  <PillButton size="sm" variant="soft" label="Reply & close" onPress={() => { setReply(''); setReplying(r); }} grow />
                </View>
              </View>
            ) : (
              <Text className="text-[11px] text-muted">{STATUS[r.status]}{r.note ? `: ${r.note}` : ''}</Text>
            )}
          </Panel>
        );
      })}

      <Sheet visible={editing !== null} onClose={() => setEditing(null)} title="Edit and approve" subtitle={editing ? `"${editing.text}"` : undefined}>
        <Panel pad="list">
          {data.products.filter((p) => p.active).map((p) => (
            <View key={p.id} className="flex-row items-center justify-between gap-3 py-2.5">
              <Text className="flex-1 text-[13px] text-foreground">{p.name}</Text>
              <Stepper size="sm" value={lines.find((l) => l.productId === p.id)?.qty ?? 0} min={0} max={p.maxPerOrder * 2} onChange={(n) => setQty(p.id, n)} />
            </View>
          ))}
        </Panel>
        <View className="gap-2">
          <Text className="text-[12px] font-semibold text-muted">Day</Text>
          <View className="flex-row flex-wrap gap-2">
            {days.map((d) => (
              <PillButton key={d} size="sm" variant={d === date ? 'filled' : 'soft'} label={fmtDay(d)} onPress={() => setDate(d)} />
            ))}
          </View>
          <Segmented values={['morning', 'afternoon'] as const} labels={['Morning', 'Afternoon']} value={run} onChange={setRun} />
        </View>
        <PillButton
          label="Approve with changes"
          disabled={lines.filter((l) => l.qty > 0).length === 0 || !date}
          onPress={() => {
            if (!editing) return;
            editApprove(editing.id, { lines: lines.filter((l) => l.qty > 0), date, run });
            setEditing(null);
          }}
        />
      </Sheet>

      <Sheet visible={replying !== null} onClose={() => setReplying(null)} title="Reply & close" subtitle="Nothing in the order book changes.">
        <Panel>
          <Input
            value={reply}
            onChangeText={setReply}
            placeholder="Your reply to the customer (optional)"
            className="bg-transparent border-0 shadow-none px-0 h-11 text-[14px] leading-none"
          />
        </Panel>
        <View className="flex-row flex-wrap gap-2">
          {["Sorry, we can't do that one. Call us on 555 0100.", "We'll sort this out and get back to you today.", 'We only read English messages for now. Please resend in English.'].map((t) => (
            <PillButton key={t} size="sm" variant="soft" label={t} onPress={() => setReply(t)} />
          ))}
        </View>
        <PillButton
          label="Send and close"
          onPress={() => {
            if (!replying) return;
            reject(replying.id, reply);
            setReplying(null);
            Alert.alert('Closed', reply.trim() ? 'Your reply was sent.' : 'Closed without a reply.');
          }}
        />
      </Sheet>
    </ScrollView>
  );
}
