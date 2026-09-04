import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Mask,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { useCameraZoomMotion } from '../../hooks/useCameraZoomMotion';
import {
  buildCameraZoomTicks,
  CAMERA_ZOOM_DEFAULTS,
  cameraZoomToAngle,
  findCameraZoomStop,
  findNearestCameraZoomStop,
  formatCameraZoomCompactNumber,
  formatCameraZoomNumber,
  formatCameraZoomValue,
  getCameraZoomRoundedTrianglePath,
  getCameraZoomTriangleHalfWidth,
  getSafeCameraZoomStep,
  isCameraZoomMajorTick,
  normalizeCameraZoomRange,
  normalizeCameraZoomStops,
  roundCameraZoom,
} from '../../utils/camera-zoom-dial/camera-zoom-math';
import {
  CAMERA_ZOOM_DIAL_COLORS,
  CAMERA_ZOOM_DIAL_GEOMETRY,
} from './constants';
import type { CameraZoomDialProps, CameraZoomStop } from './types';

export type { CameraZoomDialProps, CameraZoomStop } from './types';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const CENTER_LABEL_EXCLUSION_DEGREES = 8;
const AnimatedG = Animated.createAnimatedComponent(G);

interface Point {
  x: number;
  y: number;
}

function getPolarPoint(center: number, radius: number, angle: number): Point {
  const radians = (angle * Math.PI) / 180;
  return {
    x: center + Math.sin(radians) * radius,
    y: center - Math.cos(radians) * radius,
  };
}

function getDefaultZoomStops(min: number, max: number) {
  const preferred = [0.5, 1, 2].filter((value) => value >= min && value <= max);
  return (preferred.length > 0 ? preferred : [min]).map((value) => ({ value }));
}

/**
 * iPhone-camera-style logarithmic zoom wheel. Touch a compact zoom stop to
 * jump to it, or touch and hold then drag horizontally for fine adjustment.
 */
export function CameraZoomDial({
  minZoom = CAMERA_ZOOM_DEFAULTS.MIN,
  maxZoom = CAMERA_ZOOM_DEFAULTS.MAX,
  step: requestedStep = CAMERA_ZOOM_DEFAULTS.STEP,
  value: controlledValue,
  defaultValue,
  zoomStops: zoomStopInput,
  expanded: controlledExpanded,
  defaultExpanded = false,
  onExpandedChange,
  onZoomChange,
  onInteractionStart,
  onInteractionEnd,
  formatValue,
  accentColor = CAMERA_ZOOM_DIAL_COLORS.ACCENT,
  surfaceColor = CAMERA_ZOOM_DIAL_COLORS.SURFACE,
  labelColor = CAMERA_ZOOM_DIAL_COLORS.LABEL,
  disabled = false,
  accessibilityLabel = 'Camera zoom',
  accessibilityHint = 'Touch and hold, then drag left or right. You can also use increment and decrement actions.',
  style,
  testID,
}: CameraZoomDialProps) {
  const range = useMemo(
    () => normalizeCameraZoomRange(minZoom, maxZoom),
    [maxZoom, minZoom]
  );
  const step = getSafeCameraZoomStep(requestedStep);
  const zoomStops = useMemo(() => {
    const normalizedStops = normalizeCameraZoomStops<CameraZoomStop>(
      zoomStopInput ?? getDefaultZoomStops(range.min, range.max),
      range.min,
      range.max,
      step
    );
    return normalizedStops.length > 0
      ? normalizedStops
      : normalizeCameraZoomStops<CameraZoomStop>(
          getDefaultZoomStops(range.min, range.max),
          range.min,
          range.max,
          step
        );
  }, [range.max, range.min, step, zoomStopInput]);

  const initialZoom = roundCameraZoom(
    defaultValue ?? (range.min <= 1 && range.max >= 1 ? 1 : range.min),
    step,
    range.min,
    range.max
  );
  const zoomIsControlled = controlledValue !== undefined;
  const [uncontrolledZoom, setUncontrolledZoom] = useState(initialZoom);
  const resolvedZoom = roundCameraZoom(
    zoomIsControlled ? controlledValue : uncontrolledZoom,
    step,
    range.min,
    range.max
  );

  const expansionIsControlled = controlledExpanded !== undefined;
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    useState(defaultExpanded);
  const resolvedExpanded = expansionIsControlled
    ? controlledExpanded
    : uncontrolledExpanded;
  const expandedRef = useRef(resolvedExpanded);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [layoutWidth, setLayoutWidth] = useState(0);
  const componentId = useId();
  const pointerMaskId = `camera-zoom-pointer-mask-${componentId.replace(
    /[^a-zA-Z0-9_-]/g,
    ''
  )}`;
  const reducedMotion = useReducedMotion();
  const expansionProgress = useSharedValue(resolvedExpanded ? 1 : 0);

  const onZoomChangeRef = useRef(onZoomChange);
  const onInteractionEndRef = useRef(onInteractionEnd);
  const onExpandedChangeRef = useRef(onExpandedChange);
  const expansionIsControlledRef = useRef(expansionIsControlled);
  const controlledExpandedRef = useRef(controlledExpanded);
  useLayoutEffect(() => {
    onZoomChangeRef.current = onZoomChange;
    onInteractionEndRef.current = onInteractionEnd;
    onExpandedChangeRef.current = onExpandedChange;
    expansionIsControlledRef.current = expansionIsControlled;
    controlledExpandedRef.current = controlledExpanded;
    expandedRef.current = resolvedExpanded;
  });

  const requestExpanded = useCallback(
    (nextExpanded: boolean) => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
      if (expansionIsControlledRef.current) {
        if (controlledExpandedRef.current === nextExpanded) {
          // Keep the shared visual state aligned with the controlled prop.
          expansionProgress.set(
            withTiming(nextExpanded ? 1 : 0, {
              duration: 170,
              easing: EASE_OUT,
              reduceMotion: ReduceMotion.System,
            })
          );
          return;
        }
        onExpandedChangeRef.current?.(nextExpanded);
        return;
      }
      if (expandedRef.current === nextExpanded) return;
      expandedRef.current = nextExpanded;
      setUncontrolledExpanded(nextExpanded);
      expansionProgress.set(
        withTiming(nextExpanded ? 1 : 0, {
          duration: 170,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion.System,
        })
      );
      onExpandedChangeRef.current?.(nextExpanded);
    },
    [expansionProgress]
  );

  const handleRequestExpanded = useCallback(() => {
    requestExpanded(true);
  }, [requestExpanded]);

  const handleZoomChange = useCallback(
    (nextZoom: number) => {
      if (!zoomIsControlled) setUncontrolledZoom(nextZoom);
      onZoomChangeRef.current?.(nextZoom);
    },
    [setUncontrolledZoom, zoomIsControlled]
  );

  const handleInteractionEnd = useCallback(
    (finalZoom: number) => {
      onInteractionEndRef.current?.(finalZoom);
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = setTimeout(() => {
        requestExpanded(false);
        collapseTimerRef.current = null;
      }, CAMERA_ZOOM_DIAL_GEOMETRY.COLLAPSE_DELAY_MS);
    },
    [requestExpanded]
  );

  useEffect(
    () => () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    },
    []
  );

  useEffect(() => {
    expansionProgress.set(
      withTiming(resolvedExpanded ? 1 : 0, {
        duration: 170,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion.System,
      })
    );
  }, [expansionProgress, resolvedExpanded]);

  const diameter = layoutWidth * CAMERA_ZOOM_DIAL_GEOMETRY.DIAMETER_TO_WIDTH;
  const radius = diameter / 2;
  const unit =
    layoutWidth > 0 ? Math.max(0.75, Math.min(1.5, layoutWidth / 393)) : 1;

  const { displayZoom, gesture, moveToZoom, rotationAnimatedProps } =
    useCameraZoomMotion({
      zoom: resolvedZoom,
      minZoom: range.min,
      maxZoom: range.max,
      step,
      radius,
      enabled: !disabled && layoutWidth > 0,
      expanded: resolvedExpanded,
      onZoomChange: handleZoomChange,
      onInteractionStart,
      onInteractionEnd: handleInteractionEnd,
      onRequestExpanded: handleRequestExpanded,
    });

  const ticks = useMemo(
    () => buildCameraZoomTicks(range.min, range.max, step),
    [range.max, range.min, step]
  );
  const wheelLabels = useMemo(() => {
    const candidates: CameraZoomStop[] = [
      ...zoomStops,
      { value: range.min },
      { value: range.max },
    ];
    return normalizeCameraZoomStops<CameraZoomStop>(
      candidates,
      range.min,
      range.max,
      step
    );
  }, [range.max, range.min, step, zoomStops]);
  const activeStop = findCameraZoomStop(displayZoom, zoomStops, step);
  const formattedValue =
    formatValue?.(displayZoom) ?? formatCameraZoomValue(displayZoom, step);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setLayoutWidth((current) => (current === nextWidth ? current : nextWidth));
  }, []);

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'increment') {
        moveToZoom(displayZoom + step);
      }
      if (event.nativeEvent.actionName === 'decrement') {
        moveToZoom(displayZoom - step);
      }
    },
    [displayZoom, moveToZoom, step]
  );

  const handleCompactStopPress = useCallback(
    (stopValue: number, selected: boolean) => {
      if (selected) {
        requestExpanded(true);
        return;
      }
      moveToZoom(stopValue);
    },
    [moveToZoom, requestExpanded]
  );

  const wheelRevealStyle = useAnimatedStyle(() => {
    const progress = expansionProgress.get();
    return {
      opacity: progress,
      transform: [
        {
          scale: reducedMotion ? 1 : interpolate(progress, [0, 1], [0.46, 1]),
        },
      ],
    };
  }, [reducedMotion]);
  const compactStyle = useAnimatedStyle(() => {
    const progress = expansionProgress.get();
    return {
      opacity: 1 - progress,
      transform: [
        {
          scale: reducedMotion ? 1 : interpolate(progress, [0, 1], [1, 0.94]),
        },
      ],
    };
  }, [reducedMotion]);

  const outerTickRadius =
    radius - CAMERA_ZOOM_DIAL_GEOMETRY.OUTER_TICK_INSET * unit;
  const pointerTop = CAMERA_ZOOM_DIAL_GEOMETRY.OUTER_TICK_INSET * unit;
  const pointerHalfWidth = CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_HALF_WIDTH * unit;
  const pointerHeight = CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_HEIGHT * unit;
  const pointerOcclusionPadding =
    CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_PADDING * unit;
  const pointerOcclusionTop = Math.max(0, pointerTop - pointerOcclusionPadding);
  const pointerOcclusionApex =
    pointerTop +
    pointerHeight +
    CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_APEX_OFFSET * unit;
  const pointerOcclusionEnd =
    pointerTop +
    CAMERA_ZOOM_DIAL_GEOMETRY.MAJOR_TICK_LENGTH * unit +
    pointerOcclusionPadding;
  const pointerOcclusionHalfWidth = getCameraZoomTriangleHalfWidth(
    pointerOcclusionApex - pointerOcclusionTop,
    CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_APEX_ANGLE
  );
  const pointerOcclusionTailHalfWidth =
    CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_TAIL_HALF_WIDTH * unit;
  const pointerOcclusionTailTop =
    pointerOcclusionApex - pointerOcclusionTailHalfWidth;
  const pointerOcclusionPath = getCameraZoomRoundedTrianglePath(
    radius,
    pointerOcclusionTop,
    pointerOcclusionHalfWidth,
    pointerOcclusionApex,
    CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_CORNER_RADIUS * unit
  );
  const pointerPath = getCameraZoomRoundedTrianglePath(
    radius,
    pointerTop,
    pointerHalfWidth,
    pointerTop + pointerHeight,
    CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_CORNER_RADIUS * unit
  );
  const compactSelectedStop = findNearestCameraZoomStop(displayZoom, zoomStops);

  return (
    <GestureHandlerRootView style={[styles.gestureRoot, style]} testID={testID}>
      <GestureDetector gesture={gesture}>
        <View
          accessible={resolvedExpanded}
          accessibilityRole={resolvedExpanded ? 'adjustable' : undefined}
          accessibilityState={resolvedExpanded ? { disabled } : undefined}
          accessibilityLabel={resolvedExpanded ? accessibilityLabel : undefined}
          accessibilityHint={resolvedExpanded ? accessibilityHint : undefined}
          accessibilityValue={
            resolvedExpanded
              ? {
                  min: range.min,
                  max: range.max,
                  now: displayZoom,
                  text: formattedValue,
                }
              : undefined
          }
          aria-valuemin={resolvedExpanded ? range.min : undefined}
          aria-valuemax={resolvedExpanded ? range.max : undefined}
          aria-valuenow={resolvedExpanded ? displayZoom : undefined}
          aria-valuetext={resolvedExpanded ? formattedValue : undefined}
          accessibilityActions={
            resolvedExpanded
              ? [
                  { name: 'increment', label: 'Increment zoom' },
                  { name: 'decrement', label: 'Decrement zoom' },
                ]
              : undefined
          }
          onAccessibilityAction={
            resolvedExpanded ? handleAccessibilityAction : undefined
          }
          onLayout={handleLayout}
          style={styles.container}
        >
          {layoutWidth > 0 ? (
            <Animated.View
              style={[
                styles.wheelLayer,
                {
                  width: diameter,
                  height: diameter,
                  left: (layoutWidth - diameter) / 2,
                  pointerEvents: 'none',
                },
                wheelRevealStyle,
              ]}
            >
              <Svg width={diameter} height={diameter}>
                <Circle
                  cx={radius}
                  cy={radius}
                  r={radius}
                  fill={surfaceColor}
                />
                <Defs>
                  <Mask
                    id={pointerMaskId}
                    x={0}
                    y={0}
                    width={diameter}
                    height={diameter}
                    maskUnits="userSpaceOnUse"
                    maskContentUnits="userSpaceOnUse"
                    maskType="luminance"
                  >
                    <Rect
                      x={0}
                      y={0}
                      width={diameter}
                      height={diameter}
                      fill="#FFFFFF"
                    />
                    <Path d={pointerOcclusionPath} fill="#000000" />
                    <Rect
                      x={radius - pointerOcclusionTailHalfWidth}
                      y={pointerOcclusionTailTop}
                      width={pointerOcclusionTailHalfWidth * 2}
                      height={Math.max(
                        0,
                        pointerOcclusionEnd - pointerOcclusionTailTop
                      )}
                      rx={pointerOcclusionTailHalfWidth}
                      fill="#000000"
                    />
                  </Mask>
                </Defs>

                <G mask={`url(#${pointerMaskId})`}>
                  <AnimatedG animatedProps={rotationAnimatedProps}>
                    {ticks.map((tick) => {
                      const angle = cameraZoomToAngle(
                        tick,
                        1,
                        CAMERA_ZOOM_DIAL_GEOMETRY.DEGREES_PER_OCTAVE
                      );
                      const major = isCameraZoomMajorTick(
                        tick,
                        zoomStops,
                        step,
                        range.min,
                        range.max
                      );
                      const length =
                        (major
                          ? CAMERA_ZOOM_DIAL_GEOMETRY.MAJOR_TICK_LENGTH
                          : CAMERA_ZOOM_DIAL_GEOMETRY.MINOR_TICK_LENGTH) * unit;
                      const outer = getPolarPoint(
                        radius,
                        outerTickRadius,
                        angle
                      );
                      const inner = getPolarPoint(
                        radius,
                        outerTickRadius - length,
                        angle
                      );
                      return (
                        <Line
                          key={`tick-${tick}`}
                          x1={outer.x}
                          y1={outer.y}
                          x2={inner.x}
                          y2={inner.y}
                          stroke={
                            major
                              ? CAMERA_ZOOM_DIAL_COLORS.MAJOR_TICK
                              : CAMERA_ZOOM_DIAL_COLORS.MINOR_TICK
                          }
                          strokeWidth={(major ? 1.45 : 0.75) * unit}
                          strokeLinecap="round"
                        />
                      );
                    })}

                    {wheelLabels.map((stop) => {
                      const relativeAngle = cameraZoomToAngle(
                        stop.value,
                        displayZoom,
                        CAMERA_ZOOM_DIAL_GEOMETRY.DEGREES_PER_OCTAVE
                      );
                      if (
                        Math.abs(relativeAngle) < CENTER_LABEL_EXCLUSION_DEGREES
                      ) {
                        return null;
                      }
                      const angle = cameraZoomToAngle(
                        stop.value,
                        1,
                        CAMERA_ZOOM_DIAL_GEOMETRY.DEGREES_PER_OCTAVE
                      );
                      const labelPoint = getPolarPoint(
                        radius,
                        radius - CAMERA_ZOOM_DIAL_GEOMETRY.LABEL_INSET * unit,
                        angle
                      );
                      const focalPoint = getPolarPoint(
                        radius,
                        radius -
                          CAMERA_ZOOM_DIAL_GEOMETRY.FOCAL_LABEL_INSET * unit,
                        angle
                      );
                      const label =
                        stop.label ?? formatCameraZoomNumber(stop.value, step);
                      return (
                        <React.Fragment key={`label-${stop.value}`}>
                          <SvgText
                            x={labelPoint.x}
                            y={labelPoint.y + 5 * unit}
                            fill={labelColor}
                            fontSize={17 * unit}
                            fontWeight="400"
                            textAnchor="middle"
                            transform={`rotate(${angle} ${labelPoint.x} ${labelPoint.y})`}
                          >
                            {label}
                          </SvgText>
                          {stop.focalLength ? (
                            <SvgText
                              x={focalPoint.x}
                              y={focalPoint.y + 4 * unit}
                              fill={CAMERA_ZOOM_DIAL_COLORS.SECONDARY_LABEL}
                              fontSize={12.5 * unit}
                              fontWeight="400"
                              letterSpacing={0.35 * unit}
                              textAnchor="middle"
                              transform={`rotate(${angle} ${focalPoint.x} ${focalPoint.y})`}
                            >
                              {stop.focalLength}
                            </SvgText>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </AnimatedG>
                </G>

                <Path d={pointerPath} fill={accentColor} />
              </Svg>

              <View
                style={[
                  styles.currentLabel,
                  {
                    left: radius - 70 * unit,
                    top: 29 * unit,
                    width: 140 * unit,
                  },
                ]}
              >
                <Text
                  allowFontScaling={false}
                  style={[
                    styles.currentValue,
                    {
                      color: accentColor,
                      fontSize: 17 * unit,
                      lineHeight: 21 * unit,
                    },
                  ]}
                >
                  {formattedValue}
                </Text>
                {activeStop?.focalLength ? (
                  <Text
                    allowFontScaling={false}
                    style={[
                      styles.currentFocalLength,
                      {
                        color: accentColor,
                        fontSize: 12.5 * unit,
                        lineHeight: 17 * unit,
                      },
                    ]}
                  >
                    {activeStop.focalLength}
                  </Text>
                ) : null}
              </View>
            </Animated.View>
          ) : null}

          <Animated.View
            accessibilityElementsHidden={resolvedExpanded}
            aria-hidden={resolvedExpanded}
            importantForAccessibility={
              resolvedExpanded ? 'no-hide-descendants' : 'auto'
            }
            style={[
              styles.compactRow,
              {
                top: CAMERA_ZOOM_DIAL_GEOMETRY.COMPACT_ROW_TOP * unit,
                height: 44 * unit,
                pointerEvents: resolvedExpanded ? 'none' : 'auto',
              },
              compactStyle,
            ]}
          >
            {zoomStops.map((stop) => {
              const selected = compactSelectedStop?.value === stop.value;
              const label = selected
                ? (formatValue?.(displayZoom) ??
                  formatCameraZoomValue(displayZoom, step))
                : (stop.compactLabel ??
                  stop.label ??
                  formatCameraZoomCompactNumber(stop.value, step));
              return (
                <Pressable
                  key={`compact-${stop.value}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} zoom`}
                  accessibilityHint={
                    selected
                      ? 'Opens the adjustable zoom wheel.'
                      : `Changes zoom to ${label}.`
                  }
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  hitSlop={2}
                  pressRetentionOffset={8}
                  onPress={() => handleCompactStopPress(stop.value, selected)}
                  testID={testID ? `${testID}-stop-${stop.value}` : undefined}
                  style={({ pressed }) => [
                    styles.compactButton,
                    {
                      width: 42 * unit,
                      height: 42 * unit,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                    selected && {
                      backgroundColor: CAMERA_ZOOM_DIAL_COLORS.COMPACT_SURFACE,
                      borderRadius: 21 * unit,
                    },
                  ]}
                >
                  <Text
                    allowFontScaling={false}
                    style={[
                      styles.compactLabel,
                      {
                        color: selected ? accentColor : labelColor,
                        fontSize: 14 * unit,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    alignSelf: 'stretch',
    aspectRatio: 1 / CAMERA_ZOOM_DIAL_GEOMETRY.VISIBLE_HEIGHT_TO_WIDTH,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  wheelLayer: {
    position: 'absolute',
    top: 0,
  },
  currentLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  currentValue: {
    fontVariant: ['tabular-nums'],
    fontWeight: '400',
    textAlign: 'center',
  },
  currentFocalLength: {
    fontVariant: ['tabular-nums'],
    fontWeight: '400',
    letterSpacing: 0.35,
    textAlign: 'center',
  },
  compactRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  compactButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactLabel: {
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    textAlign: 'center',
  },
});
