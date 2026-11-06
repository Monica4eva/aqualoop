import { useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Palette } from '@/constants/theme';

import { BackHeader } from '@/components/back-header';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Pressable, pressHaptic } from '@/components/pressable';
import { useVoiceNote } from '@/features/aqua/hooks/use-voice-note';
import { UnderstoodCard } from '@/features/aqua/components/understood-card';
import { useAquaStore } from '@/features/aqua/store/aqua-store';
import { fmtStamp } from '@/features/aqua/utils/dates';

const SUGGESTIONS = [
  'Make it 3 containers this Thursday',
  'When is my next delivery?',
  'Please collect 3 empties tomorrow',
  "Skip next week, we're travelling",
  'Add 2 milk on Thursday',
];

export default function ChatScreen() {
  const data = useAquaStore((s) => s.data);
  const hid = useAquaStore((s) => s.householdId);
  const sendMessage = useAquaStore((s) => s.sendMessage);
  const [text, setText] = useState('');
  const household = data.households.find((h) => h.id === hid);
  const messages = data.messages.filter((m) => m.householdId === hid).slice().reverse();

  const send = (t: string, channel: 'text' | 'voice' = 'text') => {
    const body = t.trim();
    if (!body) return;
    pressHaptic();
    sendMessage(body, channel);
    if (channel === 'text') setText('');
  };
  const note = useVoiceNote((words) => send(words, 'voice'));
  const recording = note.phase === 'recording';
  const busy = note.phase === 'transcribing';
  const voiceLine = recording
    ? `Recording 0:${String(note.seconds).padStart(2, '0')} • tap the mic again to send`
    : busy
      ? 'Turning your voice note into text…'
      : note.error;

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <View className="px-5 pt-safe-offset-2 pb-2">
        <BackHeader title="Chat & Order" subtitle={`${household?.label ?? ''} • replies in seconds`} />
      </View>
      <FlatList
        className="flex-1"
        inverted
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerClassName="px-5 pt-4 pb-safe-offset-2 gap-3"
        ListEmptyComponent={<Text className="text-[13px] text-muted text-center">Say what you need, like "2 containers on Thursday".</Text>}
        renderItem={({ item: m }) => {
          const mine = m.from === 'customer';
          return (
            <View className={`gap-1.5 ${mine ? 'items-end' : 'items-start'}`}>
              <View className={`max-w-[82%] rounded-xl px-3.5 py-2.5 gap-1 ${mine ? 'bg-accent' : 'bg-surface'}`}>
                {m.channel === 'voice' ? (
                  <View className="flex-row items-center gap-1.5">
                    <Icon sf="waveform" ion="mic" size={13} color={mine ? 'white' : 'accent'} />
                    <Text className={`text-[11px] font-semibold ${mine ? 'text-white' : 'text-accent'}`}>Voice note • transcript</Text>
                  </View>
                ) : null}
                <Text className={`text-[14px] ${mine ? 'text-white' : 'text-foreground'}`}>{m.text}</Text>
                <Text className={`text-[10px] ${mine ? 'text-white/70' : 'text-faint'}`}>{fmtStamp(m.at, data.clock)}</Text>
              </View>
              {m.channel === 'voice' ? <Text className="text-[10px] text-faint">Audio deleted after review, transcript kept</Text> : null}
              {mine && m.result && m.result.route !== 'duplicate' ? (
                <View className="w-[82%]">
                  <UnderstoodCard result={m.result} />
                </View>
              ) : null}
              {mine && m.result?.route === 'duplicate' ? <Chip label="Already got this one" tone="muted" /> : null}
            </View>
          );
        }}
      />
        <View className="bg-background px-5 pt-2 pb-safe-offset-2 gap-2">
          <FlatList
            horizontal
            data={SUGGESTIONS}
            keyExtractor={(s) => s}
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
            renderItem={({ item }) => (
              <Pressable onPress={() => send(item)} accessibilityLabel={item}>
                <View className="rounded-full bg-sky px-3 py-1.5">
                  <Text className="text-[12px] text-accent font-medium">{item}</Text>
                </View>
              </Pressable>
            )}
          />
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => { pressHaptic(); note.toggle(); }} isDisabled={busy} accessibilityLabel={recording ? 'Stop and send voice note' : 'Record a voice note'}>
              <View className={`w-11 h-11 rounded-full items-center justify-center ${recording ? 'bg-danger' : busy ? 'bg-sky' : 'bg-surface'}`}>
                <Icon sf={recording ? 'stop.fill' : 'mic'} ion={recording ? 'stop' : 'mic-outline'} size={18} color={recording ? 'white' : 'accent'} />
              </View>
            </Pressable>
            <View className="flex-1 flex-row items-center rounded-full bg-surface px-4">
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={recording ? 'Listening…' : 'Type a message'}
                editable={!recording && !busy}
                onSubmitEditing={() => send(text)}
                returnKeyType="send"
                placeholderTextColor={Palette.muted}
                className="flex-1 h-11 text-[14px] leading-none text-foreground"
              />
            </View>
            <Pressable onPress={() => send(text)} accessibilityLabel="Send">
              <View className="w-11 h-11 rounded-full bg-accent items-center justify-center">
                <Icon sf="arrow.up" ion="arrow-up" size={18} color="white" />
              </View>
            </Pressable>
          </View>
          {voiceLine ? <Text className={`text-[11px] ${recording ? 'text-danger font-semibold' : 'text-muted'}`}>{voiceLine}</Text> : null}
          <Text className="text-[10px] text-faint">Tap the mic to speak your order. We keep the words; the audio is deleted.</Text>
        </View>
    </KeyboardAvoidingView>
  );
}
