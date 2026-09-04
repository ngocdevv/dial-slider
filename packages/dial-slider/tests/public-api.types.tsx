import { CameraZoomDial, DialSlider } from '@ngocdevv/dial-slider';
import type {
  CameraZoomDialProps,
  CameraZoomStop,
  DialPreset,
  DialSliderProps,
  DialSliderValues,
} from '@ngocdevv/dial-slider';

const presets: readonly DialPreset[] = [
  { id: 'exposure', label: 'Exposure', icon: null },
];
const values: DialSliderValues = { exposure: 10 };
const props: DialSliderProps = {
  presets,
  values,
  onValueChange: (_presetId, _value, _allValues) => {},
};

export const publicApiTypeFixture = <DialSlider {...props} />;

const zoomStops: readonly CameraZoomStop[] = [
  { value: 0.5, compactLabel: '.5', focalLength: '13MM' },
  { value: 1, focalLength: '26MM' },
  { value: 2 },
];
const zoomProps: CameraZoomDialProps = {
  minZoom: 0.5,
  maxZoom: 10,
  zoomStops,
  onZoomChange: (_zoom) => {},
};

export const cameraZoomPublicApiTypeFixture = <CameraZoomDial {...zoomProps} />;
