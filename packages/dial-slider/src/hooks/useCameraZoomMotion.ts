import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CAMERA_ZOOM_DIAL_GEOMETRY } from '../components/camera-zoom-dial/constants';
import {
  cameraLogPositionToZoom,
  cameraZoomFromTranslation,
  cameraZoomRotationMatrix,
  cameraZoomToLogPosition,
  clampCameraZoom,
  roundCameraZoom,
} from '../utils/camera-zoom-dial/camera-zoom-math';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Reanimated parses animated `transform` updates as RN/CSS transforms. Forward
// the six-value SVG affine matrix to react-native-svg before that parser runs.
function adaptSvgTransformToMatrix(props: Record<string, unknown>) {
  'worklet';
  if (!Array.isArray(props.transform)) return;
  props.matrix = props.transform;
  delete props.transform;
}

interface UseCameraZoomMotionOptions {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  step: number;
  radius: number;
  enabled: boolean;
  expanded: boolean;
  onZoomChange?: (zoom: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: (zoom: number) => void;
  onRequestExpanded?: () => void;
}

export function useCameraZoomMotion({
  zoom,
  minZoom,
  maxZoom,
  step,
  radius,
  enabled,
  expanded,
  onZoomChange,
  onInteractionStart,
  onInteractionEnd,
  onRequestExpanded,
}: UseCameraZoomMotionOptions) {
  const initialZoom = roundCameraZoom(zoom, step, minZoom, maxZoom);
  const [displayZoom, setDisplayZoom] = useState(initialZoom);
  const [isInteracting, setIsInteracting] = useState(false);

  const logZoom = useSharedValue(cameraZoomToLogPosition(initialZoom));
  const startZoom = useSharedValue(initialZoom);
  const interactionActive = useSharedValue(0);
  const lastReportedZoom = useSharedValue(initialZoom);
  const lastReportedZoomRef = useRef(initialZoom);

  const onZoomChangeRef = useRef(onZoomChange);
  const onInteractionStartRef = useRef(onInteractionStart);
  const onInteractionEndRef = useRef(onInteractionEnd);
  const onRequestExpandedRef = useRef(onRequestExpanded);

  useLayoutEffect(() => {
    onZoomChangeRef.current = onZoomChange;
    onInteractionStartRef.current = onInteractionStart;
    onInteractionEndRef.current = onInteractionEnd;
    onRequestExpandedRef.current = onRequestExpanded;
  });

  const reportZoom = useCallback((nextZoom: number) => {
    setDisplayZoom(nextZoom);
    if (lastReportedZoomRef.current === nextZoom) return;
    lastReportedZoomRef.current = nextZoom;
    onZoomChangeRef.current?.(nextZoom);
  }, []);

  const beginInteraction = useCallback(() => {
    setIsInteracting(true);
    onRequestExpandedRef.current?.();
    onInteractionStartRef.current?.();
  }, []);

  const finishInteraction = useCallback((finalZoom: number) => {
    setDisplayZoom(finalZoom);
    setIsInteracting(false);
    onInteractionEndRef.current?.(finalZoom);
  }, []);

  useAnimatedReaction(
    () => ({
      active: interactionActive.get(),
      zoom: roundCameraZoom(
        cameraLogPositionToZoom(logZoom.get()),
        step,
        minZoom,
        maxZoom
      ),
    }),
    (current, previous) => {
      if (
        current.active === 1 &&
        previous !== null &&
        current.zoom !== previous.zoom &&
        current.zoom !== lastReportedZoom.get()
      ) {
        lastReportedZoom.set(current.zoom);
        scheduleOnRN(reportZoom, current.zoom);
      }
    },
    [interactionActive, maxZoom, minZoom, step]
  );

  useEffect(() => {
    if (isInteracting || interactionActive.get() === 1) return;
    const next = roundCameraZoom(zoom, step, minZoom, maxZoom);
    lastReportedZoom.set(next);
    lastReportedZoomRef.current = next;
    // Prop-driven synchronization intentionally updates the visible label.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayZoom(next);
    logZoom.set(
      withTiming(cameraZoomToLogPosition(next), {
        duration: 180,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion.System,
      })
    );
  }, [
    interactionActive,
    isInteracting,
    lastReportedZoom,
    logZoom,
    maxZoom,
    minZoom,
    step,
    zoom,
  ]);

  const gesture = useMemo(() => {
    let pan = Gesture.Pan()
      .enabled(enabled)
      .minDistance(1)
      .onStart(() => {
        cancelAnimation(logZoom);
        startZoom.set(cameraLogPositionToZoom(logZoom.get()));
        interactionActive.set(1);
        scheduleOnRN(beginInteraction);
      })
      .onUpdate((event) => {
        const next = cameraZoomFromTranslation(
          startZoom.get(),
          event.translationX,
          radius,
          minZoom,
          maxZoom,
          CAMERA_ZOOM_DIAL_GEOMETRY.DEGREES_PER_OCTAVE
        );
        logZoom.set(cameraZoomToLogPosition(next));
      })
      .onFinalize((event) => {
        if (interactionActive.get() === 0) return;
        const finalZoom = roundCameraZoom(
          cameraLogPositionToZoom(logZoom.get()),
          step,
          minZoom,
          maxZoom
        );
        const pointsPerOctave = Math.max(
          1,
          radius *
            ((CAMERA_ZOOM_DIAL_GEOMETRY.DEGREES_PER_OCTAVE * Math.PI) / 180)
        );
        const velocity = -event.velocityX / pointsPerOctave;
        interactionActive.set(0);
        lastReportedZoom.set(finalZoom);
        logZoom.set(
          withSpring(cameraZoomToLogPosition(finalZoom), {
            duration: 400,
            dampingRatio: 1,
            velocity,
            overshootClamping: true,
            reduceMotion: ReduceMotion.System,
          })
        );
        scheduleOnRN(reportZoom, finalZoom);
        scheduleOnRN(finishInteraction, finalZoom);
      });

    if (!expanded) {
      pan = pan.activateAfterLongPress(CAMERA_ZOOM_DIAL_GEOMETRY.LONG_PRESS_MS);
    }
    return pan;
  }, [
    beginInteraction,
    enabled,
    expanded,
    finishInteraction,
    interactionActive,
    lastReportedZoom,
    logZoom,
    maxZoom,
    minZoom,
    radius,
    reportZoom,
    startZoom,
    step,
  ]);

  const rotationAnimatedProps = useAnimatedProps(
    () => ({
      transform: cameraZoomRotationMatrix(
        -logZoom.get() * CAMERA_ZOOM_DIAL_GEOMETRY.DEGREES_PER_OCTAVE,
        radius
      ),
    }),
    [radius],
    adaptSvgTransformToMatrix
  );

  const moveToZoom = useCallback(
    (requestedZoom: number) => {
      if (!enabled) return;
      const next = roundCameraZoom(
        clampCameraZoom(requestedZoom, minZoom, maxZoom),
        step,
        minZoom,
        maxZoom
      );
      if (next === displayZoom) return;
      cancelAnimation(logZoom);
      interactionActive.set(1);
      lastReportedZoom.set(displayZoom);
      setIsInteracting(true);
      onInteractionStartRef.current?.();
      logZoom.set(
        withTiming(
          cameraZoomToLogPosition(next),
          {
            duration: 180,
            easing: EASE_OUT,
            reduceMotion: ReduceMotion.System,
          },
          (finished) => {
            if (!finished) return;
            interactionActive.set(0);
            lastReportedZoom.set(next);
            scheduleOnRN(reportZoom, next);
            scheduleOnRN(finishInteraction, next);
          }
        )
      );
    },
    [
      displayZoom,
      enabled,
      finishInteraction,
      interactionActive,
      lastReportedZoom,
      logZoom,
      maxZoom,
      minZoom,
      reportZoom,
      step,
    ]
  );

  return {
    displayZoom,
    gesture,
    moveToZoom,
    rotationAnimatedProps,
  };
}
