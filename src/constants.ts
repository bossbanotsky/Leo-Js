
export const UNITS = [
  { label: 'Kilograms (kg)', value: 'kg', base: 'kg', factor: 1 },
  { label: 'Pieces (pcs)', value: 'pcs', base: 'pcs', factor: 1 },
  { label: 'Grams (g)', value: 'g', base: 'kg', factor: 0.001 },
  { label: 'Tons (t)', value: 't', base: 'kg', factor: 1000 },
  { label: 'Sacks (Small)', value: 'sack_s', base: 'kg', factor: 25 },
  { label: 'Sacks (Large)', value: 'sack_l', base: 'kg', factor: 50 },
  { label: 'Bundles', value: 'bundle', base: 'pcs', factor: 1 },
  { label: 'Crates', value: 'crate', base: 'pcs', factor: 1 },
  { label: 'Rolls', value: 'roll', base: 'pcs', factor: 1 },
  { label: 'Meters (m)', value: 'm', base: 'm', factor: 1 },
];

export const UNIT_GROUPS = {
  WEIGHT: ['kg', 'g', 't', 'sack_s', 'sack_l'],
  COUNT: ['pcs', 'bundle', 'crate', 'roll'],
  LENGTH: ['m']
};
