import { MaterialType } from '../types';

export const defaultMaterials: { name: string; type: MaterialType; buyPrice: number; sellPrice: number; unit: 'kg' | 'pcs' }[] = [
  // Metals (Bakal / Tanso / Aluminum)
  { name: 'Tanso (Balat / Bare Bright)', type: 'Metal', buyPrice: 380, sellPrice: 420, unit: 'kg' },
  { name: 'Tanso (Sunog / Burnt)', type: 'Metal', buyPrice: 340, sellPrice: 375, unit: 'kg' },
  { name: 'Tansong Dilaw (Brass)', type: 'Metal', buyPrice: 180, sellPrice: 210, unit: 'kg' },
  { name: 'Aluminum (Kaldero / Cast)', type: 'Metal', buyPrice: 60, sellPrice: 75, unit: 'kg' },
  { name: 'Aluminum (Jalousie / Extrusion)', type: 'Metal', buyPrice: 50, sellPrice: 65, unit: 'kg' },
  { name: 'Aluminum (Lata / Cans)', type: 'Metal', buyPrice: 40, sellPrice: 55, unit: 'kg' },
  { name: 'Stainless Steel (Non-Magnetic)', type: 'Metal', buyPrice: 40, sellPrice: 55, unit: 'kg' },
  { name: 'Bakal (Heavy / Makapal)', type: 'Metal', buyPrice: 14, sellPrice: 18, unit: 'kg' },
  { name: 'Yero / Lata (Light Scrap)', type: 'Metal', buyPrice: 7, sellPrice: 10, unit: 'kg' },
  { name: 'Tingga (Lead)', type: 'Metal', buyPrice: 40, sellPrice: 55, unit: 'kg' },
  
  // Paper & Cardboard (Papel / Karton)
  { name: 'Karton (Corrugated)', type: 'Paper', buyPrice: 3.5, sellPrice: 5.5, unit: 'kg' },
  { name: 'Papel (White / Bond Paper)', type: 'Paper', buyPrice: 6, sellPrice: 9, unit: 'kg' },
  { name: 'Papel (Assorted / Colored)', type: 'Paper', buyPrice: 1.5, sellPrice: 3, unit: 'kg' },
  { name: 'Dyaryo (Newspaper)', type: 'Paper', buyPrice: 2.5, sellPrice: 4.5, unit: 'kg' },

  // Plastics (Plastik / Sibak / Bote)
  { name: 'PET Bottles (Mineral Water)', type: 'Plastic', buyPrice: 12, sellPrice: 18, unit: 'kg' },
  { name: 'Sibak (Puti / Clear Hard Plastic)', type: 'Plastic', buyPrice: 16, sellPrice: 24, unit: 'kg' },
  { name: 'Sibak (Assorted Colors / Chairs / Basins)', type: 'Plastic', buyPrice: 12, sellPrice: 18, unit: 'kg' },
  { name: 'PVC Pipes', type: 'Plastic', buyPrice: 5, sellPrice: 10, unit: 'kg' },
  { name: 'Plastik (Assorted Soft / Sando)', type: 'Plastic', buyPrice: 2, sellPrice: 5, unit: 'kg' },

  // Electronics (E-Waste)
  { name: 'Motherboards (Class A)', type: 'Electronics', buyPrice: 120, sellPrice: 160, unit: 'kg' },
  { name: 'E-Waste (Assorted Boards)', type: 'Electronics', buyPrice: 15, sellPrice: 30, unit: 'kg' },
  { name: 'Hard Drives', type: 'Electronics', buyPrice: 25, sellPrice: 40, unit: 'pcs' },

  // Glass (Bote)
  { name: 'Bote (Assorted / Basag)', type: 'Glass', buyPrice: 1, sellPrice: 2.5, unit: 'kg' },
  { name: 'Bote (Beer / Lapad / Longneck)', type: 'Glass', buyPrice: 1, sellPrice: 2, unit: 'pcs' },

  // Other (Iba pa)
  { name: 'Baterya (Car / Truck Battery)', type: 'Other', buyPrice: 200, sellPrice: 280, unit: 'pcs' },
  { name: 'Sako (Used Sacks)', type: 'Other', buyPrice: 1, sellPrice: 3, unit: 'pcs' }
];
