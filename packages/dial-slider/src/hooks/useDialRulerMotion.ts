import { useCallback, useLayoutEffect, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  ReduceMotion,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { DIAL_CONFIG } from '../components/dial-slider/constants';
import {
  dialTranslationToValue,
  dialValueToTranslation,
  getDialTranslationBounds,
  snapDialTranslation,
} from '../utils/dial-slider/dial-math';

const { TICK_SPACING, FLING_DECELERATION } = DIAL_CONFIG;

interface UseDialRulerMotionOptions {
  value: SharedValue<number>;
  initialValue: number;
  minValue: number;
  maxValue: number;
  enabled: boolean;
  interactionRevision?: SharedValue<number>;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

export function useDialRulerMotion({
  value,
  initialValue,
  minValue,
  maxValue,
  enabled,
  interactionRevision,
  onInteractionStart,
  onInteractionEnd,
}: UseDialRulerMotionOptions) {
  const { minTranslation, maxTranslation } = getDialTranslationBounds(
    minValue,
    maxValue,
    TICK_SPACING
  );
  const initialTranslation = dialValueToTranslation(
    initialValue,
    minValue,
    maxValue,
    TICK_SPACING
  );

  const translationX = useSharedValue(initialTranslation);
  const startX = useSharedValue(initialTranslation);
  const isDragging = useSharedValue(0);
  const isGestureActive = useSharedValue(0);
  const gestureRevision = useSharedValue(0);
  const isProgrammaticMove = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  const interactionStartRef = useRef(onInteractionStart);
  const interactionEndRef = useRef(onInteractionEnd);
  useLayoutEffect(() => {
    interactionStartRef.current = onInteractionStart;
    interactionEndRef.current = onInteractionEnd;
  });

  const notifyInteractionStart = useCallback(() => {
    interactionStartRef.current?.();
  }, []);
  const notifyInteractionEnd = useCallback(() => {
    interactionEndRef.current?.();
  }, []);

  const gesture = Gesture.Pan()
    .enabled(enabled)
    .onBegin(() => {
      cancelAnimation(translationX);
      isProgrammaticMove.set(0);
      isGestureActive.set(1);
      gestureRevision.set(interactionRevision ? interactionRevision.get() : 0);
      startX.set(translationX.get());
      scheduleOnRN(notifyInteractionStart);
    })
    .onUpdate((event) => {
      const nextX = startX.get() + event.translationX;
      translationX.set(
        Math.max(minTranslation, Math.min(maxTranslation, nextX))
      );
      cancelAnimation(isDragging);
      isDragging.set(
        withSequence(
          withTiming(1, {
            duration: 0,
            reduceMotion: ReduceMotion.System,
          }),
          withDelay(
            100,
            withTiming(0, {
              duration: 200,
              reduceMotion: ReduceMotion.System,
            })
          )
        )
      );
    })
    .onEnd((event) => {
      isDragging.set(
        withTiming(0, {
          duration: 200,
          reduceMotion: ReduceMotion.System,
        })
      );
      cancelAnimation(translationX);
      translationX.set(
        withDecay(
          {
            velocity: event.velocityX,
            clamp: [minTranslation, maxTranslation],
            deceleration: FLING_DECELERATION,
            reduceMotion: ReduceMotion.System,
          },
          (finished) => {
            if (!finished) return;
            const targetX = snapDialTranslation(
              translationX.get(),
              minValue,
              maxValue,
              TICK_SPACING
            );
            translationX.set(
              withSpring(
                targetX,
                {
                  damping: 34,
                  stiffness: 280,
                  mass: 0.75,
                  overshootClamping: true,
                  reduceMotion: ReduceMotion.System,
                },
                (springFinished) => {
                  if (springFinished) {
                    translationX.set(targetX);
                  }
                }
              )
            );
          }
        )
      );
    })
    .onFinalize(() => {
      isGestureActive.set(0);
      scheduleOnRN(notifyInteractionEnd);
    });

  useAnimatedReaction(
    () =>
      Math.round(
        dialTranslationToValue(
          translationX.get(),
          minValue,
          maxValue,
          TICK_SPACING
        )
      ),
    (current, previous) => {
      if (isProgrammaticMove.get() !== 0) return;
      if (
        interactionRevision &&
        gestureRevision.get() !== interactionRevision.get()
      ) {
        return;
      }
      if (current !== previous && current !== Math.round(value.get())) {
        value.set(current);
      }
    }
  );

  useAnimatedReaction(
    () => ({
      value: Math.round(value.get()),
      gestureActive: isGestureActive.get(),
      revision: interactionRevision ? interactionRevision.get() : 0,
    }),
    (current, previous) => {
      if (previous === null || current.gestureActive !== 0) return;

      const revisionChanged = current.revision !== previous.revision;
      if (revisionChanged) cancelAnimation(translationX);

      const fromX = Math.round(
        dialTranslationToValue(
          translationX.get(),
          minValue,
          maxValue,
          TICK_SPACING
        )
      );
      if (fromX === current.value) {
        if (revisionChanged) isProgrammaticMove.set(0);
        return;
      }

      const target = dialValueToTranslation(
        current.value,
        minValue,
        maxValue,
        TICK_SPACING
      );
      cancelAnimation(translationX);
      isProgrammaticMove.set(1);
      translationX.set(
        withTiming(
          target,
          {
            duration: 120,
            reduceMotion: ReduceMotion.System,
          },
          () => {
            isProgrammaticMove.set(0);
          }
        )
      );
    }
  );

  useAnimatedReaction(
    () => (interactionRevision ? interactionRevision.get() : 0),
    (current, previous) => {
      if (previous === null || current === previous) return;
      cancelAnimation(contentOpacity);
      contentOpacity.set(
        withSequence(
          withTiming(0.28, {
            duration: 160,
            reduceMotion: ReduceMotion.System,
          }),
          withTiming(1, {
            duration: 380,
            reduceMotion: ReduceMotion.System,
          })
        )
      );
    }
  );

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.get(),
  }));

  return {
    contentStyle,
    gesture,
    isDragging,
    startX,
    translationX,
  };
}
