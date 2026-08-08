import { useCallback, useLayoutEffect, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
    cancelAnimation,
    runOnJS,
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

import { DIAL_CONFIG } from '@/components/dial-slider/constants';

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
    const minTranslation = -maxValue * TICK_SPACING;
    const maxTranslation = -minValue * TICK_SPACING;
    const initialTranslation = Math.max(
        minTranslation,
        Math.min(maxTranslation, -initialValue * TICK_SPACING)
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
            isProgrammaticMove.value = 0;
            isGestureActive.value = 1;
            gestureRevision.value = interactionRevision
                ? interactionRevision.value
                : 0;
            startX.value = translationX.value;
            runOnJS(notifyInteractionStart)();
        })
        .onUpdate((event) => {
            const nextX = startX.value + event.translationX;
            translationX.value = Math.max(
                minTranslation,
                Math.min(maxTranslation, nextX)
            );
            cancelAnimation(isDragging);
            isDragging.value = withSequence(
                withTiming(1, { duration: 0 }),
                withDelay(100, withTiming(0, { duration: 200 }))
            );
        })
        .onEnd((event) => {
            isDragging.value = withTiming(0, { duration: 200 });
            cancelAnimation(translationX);
            translationX.value = withDecay(
                {
                    velocity: event.velocityX,
                    clamp: [minTranslation, maxTranslation],
                    deceleration: FLING_DECELERATION,
                },
                (finished) => {
                    if (!finished) return;
                    const snapped =
                        Math.round(translationX.value / TICK_SPACING) *
                        TICK_SPACING;
                    const targetX = Math.max(
                        minTranslation,
                        Math.min(maxTranslation, snapped)
                    );
                    translationX.value = withSpring(
                        targetX,
                        {
                            damping: 34,
                            stiffness: 280,
                            mass: 0.75,
                            overshootClamping: true,
                        },
                        (springFinished) => {
                            if (springFinished) {
                                translationX.value = targetX;
                            }
                        }
                    );
                }
            );
        })
        .onFinalize(() => {
            isGestureActive.value = 0;
            runOnJS(notifyInteractionEnd)();
        });

    useAnimatedReaction(
        () => Math.round(-translationX.value / TICK_SPACING),
        (current, previous) => {
            if (isProgrammaticMove.value !== 0) return;
            if (
                interactionRevision &&
                gestureRevision.value !== interactionRevision.value
            ) {
                return;
            }
            if (current !== previous && current !== Math.round(value.value)) {
                value.value = current;
            }
        }
    );

    useAnimatedReaction(
        () => ({
            value: Math.round(value.value),
            gestureActive: isGestureActive.value,
            revision: interactionRevision ? interactionRevision.value : 0,
        }),
        (current, previous) => {
            if (previous === null || current.gestureActive !== 0) return;

            const revisionChanged = current.revision !== previous.revision;
            if (revisionChanged) cancelAnimation(translationX);

            const fromX = Math.round(-translationX.value / TICK_SPACING);
            if (fromX === current.value) {
                if (revisionChanged) isProgrammaticMove.value = 0;
                return;
            }

            const target = Math.max(
                minTranslation,
                Math.min(maxTranslation, -current.value * TICK_SPACING)
            );
            cancelAnimation(translationX);
            isProgrammaticMove.value = 1;
            translationX.value = withTiming(
                target,
                { duration: 120 },
                () => {
                    isProgrammaticMove.value = 0;
                }
            );
        }
    );

    useAnimatedReaction(
        () => (interactionRevision ? interactionRevision.value : 0),
        (current, previous) => {
            if (previous === null || current === previous) return;
            cancelAnimation(contentOpacity);
            contentOpacity.value = withSequence(
                withTiming(0.28, { duration: 160 }),
                withTiming(1, { duration: 380 })
            );
        }
    );

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
    }));

    return {
        contentStyle,
        gesture,
        isDragging,
        startX,
        translationX,
    };
}
