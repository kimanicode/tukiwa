type ChamaEvent = {
  type: string;
  payload: unknown;
};

type Broadcaster = (chamaId: string, event: ChamaEvent) => void;
type UserBroadcaster = (userId: string, event: ChamaEvent) => void;

let broadcaster: Broadcaster = () => {};
let userBroadcaster: UserBroadcaster = () => {};

export function setChamaBroadcaster(nextBroadcaster: Broadcaster): void {
  broadcaster = nextBroadcaster;
}

export function emitChamaEvent(chamaId: string, event: ChamaEvent): void {
  broadcaster(chamaId, event);
}

export function setUserBroadcaster(nextBroadcaster: UserBroadcaster): void {
  userBroadcaster = nextBroadcaster;
}

export function emitUserEvent(userId: string, event: ChamaEvent): void {
  userBroadcaster(userId, event);
}
