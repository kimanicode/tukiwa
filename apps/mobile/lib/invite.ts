const JOIN_BASE_URL = "https://tukiwa.app/join/chama";

export function chamaInviteLink(chamaId: string) {
  return `${JOIN_BASE_URL}/${encodeURIComponent(chamaId)}`;
}

export function chamaInviteMessage(chamaName: string, chamaId: string) {
  return `Join ${chamaName} on Tukiwa: ${chamaInviteLink(chamaId)}`;
}
