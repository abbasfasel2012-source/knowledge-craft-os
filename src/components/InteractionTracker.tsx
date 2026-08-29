import { useEffect, useRef } from "react";

interface InteractionEvent {
  type: "play" | "pause" | "seek" | "like" | "comment" | "share" | "view";
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface InteractionTrackerProps {
  courseId: string;
  videoId?: string;
  userId?: string;
  onTrack?: (event: InteractionEvent) => void;
}

export function InteractionTracker({
  courseId,
  videoId,
  userId,
  onTrack,
}: InteractionTrackerProps) {
  const eventsRef = useRef<InteractionEvent[]>([]);

  const trackEvent = (event: InteractionEvent) => {
    eventsRef.current.push(event);

    // Batch events and send every 30 seconds or 10 events
    if (eventsRef.current.length >= 10 || eventsRef.current.length > 0) {
      const shouldFlush =
        eventsRef.current.length >= 10 ||
        (eventsRef.current.length > 0 &&
          Date.now() - (eventsRef.current[0].timestamp || 0) > 30000);

      if (shouldFlush) {
        if (onTrack) {
          eventsRef.current.forEach(onTrack);
        }
        eventsRef.current = [];
      }
    }
  };

  useEffect(() => {
    // Track page view
    trackEvent({
      type: "view",
      timestamp: Date.now(),
      metadata: { courseId, videoId, userId },
    });

    // Cleanup on unmount - flush remaining events
    return () => {
      if (eventsRef.current.length > 0 && onTrack) {
        eventsRef.current.forEach(onTrack);
      }
    };
  }, [courseId, videoId, userId]);

  return {
    trackEvent,
    events: eventsRef.current,
  };
}
