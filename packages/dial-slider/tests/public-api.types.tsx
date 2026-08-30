import { DialSlider } from '@ngocdevv/dial-slider';
import type {
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
