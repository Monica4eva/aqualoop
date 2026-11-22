import * as Haptics from "expo-haptics";

export const Presets = {
  System: {
    selection: () => Haptics.selectionAsync(),
    notificationSuccess: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    notificationWarning: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  },
};
