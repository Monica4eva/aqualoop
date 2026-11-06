import { Text, View } from 'react-native';

import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Panel } from '@/components/panel';
import { RouteChip } from '@/features/aqua/components/route-chip';
import { RuleChips } from '@/features/aqua/components/rule-chips';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import type { MessageResult } from '@/features/aqua/types/aqua';
import { fmtLongDay } from '@/features/aqua/utils/dates';
import { INTENT_LABEL } from '@/features/aqua/utils/rules';
import { linesText, returnsText } from '@/features/aqua/utils/schedule';

type UnderstoodCardProps = {
  result: MessageResult;
  /** Owner view shows the rule chips and the reader's sureness. */
  detailed?: boolean;
};

/** "What we understood": the plain-words reading of a message. */
export function UnderstoodCard({ result, detailed }: UnderstoodCardProps) {
  const data = useAquaStore((s) => s.data);
  const { parsed, resolution: res } = result;
  const items = res.lines.length > 0 ? linesText(data, res.lines) : null;
  const back = returnsText(res.returns);
  return (
    <Panel tone="ai" pad="tight">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-1.5">
          <Icon sf="sparkles" ion="sparkles" size={13} color="ai" />
          <Text className="text-[12px] font-semibold text-ai">What we understood</Text>
        </View>
        <Chip label={result.parser} tone="ai" />
      </View>
      <Text className="text-[13px] text-foreground">{parsed.summary}</Text>
      <View className="gap-1">
        <Text className="text-[11px] text-muted">
          {INTENT_LABEL[parsed.intent]}
          {res.date ? ` · ${fmtLongDay(res.date)}, ${res.run} run` : ''}
        </Text>
        {items ? <Text className="text-[11px] text-muted">Order: {items}</Text> : null}
        {back ? <Text className="text-[11px] text-muted">Collect: {back}</Text> : null}
        {detailed ? <Text className="text-[11px] text-muted">Sureness: {Math.round(parsed.confidence * 100)}%</Text> : null}
      </View>
      <View className="flex-row flex-wrap items-center gap-1.5">
        <RouteChip route={result.route} />
      </View>
      {detailed ? <RuleChips rules={result.rules} /> : null}
    </Panel>
  );
}
