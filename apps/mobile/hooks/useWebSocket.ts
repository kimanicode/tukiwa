import { useCallback, useEffect, useRef } from "react";
import { apiUrl } from "../lib/api";

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
