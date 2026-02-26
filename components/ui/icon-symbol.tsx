// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for Nurse Rescue app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "list.bullet": "list",
  "clock.arrow.circlepath": "history",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  // Medical / Game
  "stethoscope": "local-hospital",
  "heart.fill": "favorite",
  "cross.fill": "add",
  "waveform.path.ecg": "monitor-heart",
  "thermometer": "thermostat",
  "drop.fill": "water-drop",
  "lungs.fill": "air",
  "brain.head.profile": "psychology",
  "pill.fill": "medication",
  "syringe.fill": "vaccines",
  "bandage.fill": "healing",
  "person.fill": "person",
  "person.2.fill": "people",
  "phone.fill": "phone",
  "exclamationmark.triangle.fill": "warning",
  "clock.fill": "schedule",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "star.fill": "star",
  "trophy.fill": "emoji-events",
  "chart.bar.fill": "bar-chart",
  "doc.text.fill": "description",
  "pencil": "edit",
  "eye.fill": "visibility",
  "ear.fill": "hearing",
  "hand.raised.fill": "back-hand",
  "bolt.fill": "bolt",
  "wind": "air",
  "gauge": "speed",
  "message.fill": "message",
  "clipboard.fill": "assignment",
  "arrow.clockwise": "refresh",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "stop.fill": "stop",
  "info.circle.fill": "info",
  "lock.fill": "lock",
  "checkmark": "check",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
