import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { colors, SoftCard } from "../ui";

export function InviteShareCard({ link }: { link: string }) {
  const message = `Join my chama on Tukiwa: ${link}`;
  return (
    <SoftCard style={styles.card}>
      <View>
        <Text style={styles.label}>Invite link</Text>
        <Text style={styles.link}>{link}</Text>
      </View>
      <View style={styles.actions}>
        <ShareButton label="WhatsApp" onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(message)}`)} />
        <ShareButton label="SMS" onPress={() => Linking.openURL(`sms:?body=${encodeURIComponent(message)}`)} />
        <ShareButton label="Copy" onPress={() => Share.share({ message })} />
      </View>
      <View style={styles.qr}>
        <Text style={styles.qrText}>QR</Text>
      </View>
    </SoftCard>
  );
}

function ShareButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.shareButton} onPress={onPress}>
      <Text style={styles.shareText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  label: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 12 },
  link: { fontFamily: "sans-serif", color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 3 },
  actions: { flexDirection: "row", gap: 8 },
  shareButton: { alignItems: "center", backgroundColor: colors.greenLight, borderRadius: 999, flex: 1, paddingVertical: 9 },
  shareText: { fontFamily: "sans-serif", color: colors.green, fontSize: 12, fontWeight: "900" },
  qr: { alignItems: "center", backgroundColor: "#E8E3D6", borderRadius: 18, height: 104, justifyContent: "center" },
  qrText: { fontFamily: "sans-serif", color: colors.textMuted, fontSize: 18, fontWeight: "900" }
});
