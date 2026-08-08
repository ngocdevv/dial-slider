# Welcome to your Expo app 👋

## Preset dial slider

`PresetDialSlider` reproduces the interaction model of the iPhone Photos
adjustment controls: a freely scrollable preset strip, independent values per
preset, a ruler shared by the selected preset, and a transient value badge while
dragging.

```tsx
import {
  PresetDialSlider,
  type DialPreset,
} from '@/components/dial-slider';

const presets: readonly DialPreset[] = [
  {
    id: 'exposure',
    label: 'Exposure',
    icon: ({ selected }) => (
      <MyExposureIcon color={selected ? '#fff' : '#aaa'} />
    ),
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
  {
    id: 'contrast',
    label: 'Contrast',
    icon: <MyContrastIcon />,
    minValue: -100,
    maxValue: 100,
  },
];

<PresetDialSlider
  presets={presets}
  initialPresetId="exposure"
  onPresetChange={(presetId, value) => {
    // Load the selected adjustment preview.
  }}
  onValueChange={(presetId, value, allValues) => {
    // Apply the live image adjustment.
  }}
/>
```

Each preset accepts `id`, `label`, `icon`, `minValue`, `maxValue`,
`initialValue`, optional accessibility `step`, `formatValue`, and `disabled`.
Use stable, unique IDs; if duplicates are supplied, the first preset with that ID
wins deterministically. Non-finite ranges fall back to the default dial range;
finite bounds are clamped to `±1,000,000` so ruler transforms remain safe, and
very large ranges cap their rendered tick count.

The component preserves each preset's value while the user switches or scrolls
between tools. `onValuesChange` provides the complete value map, including when
a dynamic preset update adds, removes, or clamps values.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
