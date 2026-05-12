import { useCallback, useEffect, useRef } from "react";
import { apiUrl, type TxProposal } from "../lib/api";
import { useChamaStore } from "../stores/chama.store";

type Handler = (payload: unknown) => void;

export function useWebSocket(chamaId?: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(new Map<string, Set<Handler>>());

  useEffect(() => {
    if (!chamaId) return undefined;
    const wsBase = apiUrl().replace(/^http/, "ws");
    const socket = new WebSocket(`${wsBase}/ws/chamas/${chamaId}`);
    socketRef.current = socket;
    socket.onmessage = (message) => {
      const event = JSON.parse(message.data) as { type: string; payload: unknown };
      if (isProposalEvent(event.type) && isProposalPayload(event.payload)) {
        if (event.type === "PROPOSAL_CREATED") {
          useChamaStore.getState().addProposal(event.payload);
        } else {
          useChamaStore.getState().updateProposal(event.payload.id, event.payload);
        }
      }
      handlersRef.current.get(event.type)?.forEach((handler) => handler(event.payload));
    };
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [chamaId]);

  const onEvent = useCallback((eventType: string, handler: Handler) => {
    const handlers = handlersRef.current.get(eventType) ?? new Set<Handler>();
    handlers.add(handler);
    handlersRef.current.set(eventType, handlers);
    return () => handlers.delete(handler);
  }, []);

  return { socket: socketRef.current, onEvent };
}

function isProposalEvent(type: string): boolean {
  return [
    "PROPOSAL_CREATED",
    "PROPOSAL_APPROVED",
    "PROPOSAL_REJECTED",
    "PROPOSAL_EXECUTED",
    "PROPOSAL_EXPIRED"
  ].includes(type);
}

function isProposalPayload(payload: unknown): payload is TxProposal {
  return typeof payload === "object" && payload !== null && typeof (payload as TxProposal).id === "string";
}
