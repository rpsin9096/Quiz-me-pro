import { useState, useRef, useCallback, TouchEvent as ReactTouchEvent } from "react";
import { triggerHaptic } from "@/lib/sound";

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventVerticalScrollWhenSwipingHorizontal?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 70,
  preventVerticalScrollWhenSwipingHorizontal = true,
}: SwipeGestureOptions) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeDirection, setActiveDirection] = useState<"left" | "right" | "up" | "down" | null>(null);

  const startCoord = useRef<{ x: number; y: number; time: number } | null>(null);
  const isHorizontalGesture = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: ReactTouchEvent | TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startCoord.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    isHorizontalGesture.current = null;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent | TouchEvent) => {
      if (!startCoord.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startCoord.current.x;
      const deltaY = touch.clientY - startCoord.current.y;

      // Lock direction after initial movement
      if (isHorizontalGesture.current === null) {
        if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
          if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
            isHorizontalGesture.current = true;
          } else {
            isHorizontalGesture.current = false;
          }
        }
      }

      // If it's a vertical scroll, allow native page scrolling and reset card drag
      if (isHorizontalGesture.current === false) {
        setDragOffset({ x: 0, y: 0 });
        setActiveDirection(null);
        return;
      }

      // If horizontal gesture, prevent native browser bounce/scroll
      if (isHorizontalGesture.current === true) {
        if (preventVerticalScrollWhenSwipingHorizontal && e.cancelable) {
          e.preventDefault();
        }

        // Apply slight resistance to card dragging
        const resistanceFactor = 0.85;
        const boundedX = deltaX * resistanceFactor;
        setDragOffset({ x: boundedX, y: 0 });

        if (deltaX < -30) {
          setActiveDirection("left");
        } else if (deltaX > 30) {
          setActiveDirection("right");
        } else {
          setActiveDirection(null);
        }
      }
    },
    [preventVerticalScrollWhenSwipingHorizontal]
  );

  const handleTouchEnd = useCallback(
    (e: ReactTouchEvent | TouchEvent) => {
      if (!startCoord.current) {
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        setActiveDirection(null);
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startCoord.current.x;
      const deltaY = touch.clientY - startCoord.current.y;
      const elapsed = Date.now() - startCoord.current.time;
      const velocityX = Math.abs(deltaX) / Math.max(elapsed, 1);

      // Trigger swipe if past threshold or fast flick
      const isSwipe = Math.abs(deltaX) >= threshold || (Math.abs(deltaX) > 40 && velocityX > 0.35);

      if (isHorizontalGesture.current === true && isSwipe) {
        if (deltaX > 0 && onSwipeRight) {
          triggerHaptic("medium");
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          triggerHaptic("medium");
          onSwipeLeft();
        }
      } else if (isHorizontalGesture.current === false) {
        // Vertical check if needed
        if (deltaY < -threshold && onSwipeUp) {
          onSwipeUp();
        } else if (deltaY > threshold && onSwipeDown) {
          onSwipeDown();
        }
      }

      startCoord.current = null;
      isHorizontalGesture.current = null;
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
      setActiveDirection(null);
    },
    [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]
  );

  const handleTouchCancel = useCallback(() => {
    startCoord.current = null;
    isHorizontalGesture.current = null;
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    setActiveDirection(null);
  }, []);

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    dragOffset,
    isDragging,
    activeDirection,
  };
}
