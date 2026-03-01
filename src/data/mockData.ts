import {
  LayoutDashboard,
  Calculator,
  PackageSearch,
  GitMerge,
  Megaphone,
  Network,
  Scale,
  CakeSlice,
} from 'lucide-react';

export const navigation = [
  { id: 'dashboard', name: 'Dashboard Principal', icon: LayoutDashboard },
  { id: 'escandallos', name: 'Escandallos Dinámicos', icon: Calculator },
  { id: 'inventario', name: 'Inventario Predictivo', icon: PackageSearch },
  { id: 'trazabilidad', name: 'Trazabilidad y Calidad', icon: GitMerge },
  { id: 'ecosistema', name: 'Ecosistema Comercial GHL', icon: Megaphone },
  { id: 'integracion', name: 'Integración Middleware', icon: Network },
  { id: 'cumplimiento', name: 'Cumplimiento Legal', icon: Scale },
  { id: 'workflow', name: 'Workflow Tarta Personalizada', icon: CakeSlice },
];

export const initialIngredients = [
  { id: 'i1', name: 'Harina de Trigo Premium', stock: 150, reorderPoint: 50, demand7d: 40, status: 'ok', unit: 'kg', price: 1.20, var3m: 5 },
  { id: 'i2', name: 'Cacao Puro 70% Valrhona', stock: 15, reorderPoint: 20, demand7d: 18, status: 'warning', unit: 'kg', price: 18.50, var3m: 12 },
  { id: 'i3', name: 'Mantequilla Asturiana', stock: 8, reorderPoint: 30, demand7d: 25, status: 'critical', unit: 'kg', price: 8.90, var3m: 15 },
  { id: 'i4', name: 'Azúcar Blanquilla', stock: 200, reorderPoint: 100, demand7d: 80, status: 'ok', unit: 'kg', price: 0.95, var3m: -2 },
  { id: 'i5', name: 'Huevos Camperos (Docena)', stock: 40, reorderPoint: 50, demand7d: 60, status: 'warning', unit: 'uds', price: 2.50, var3m: 8 },
  { id: 'i6', name: 'Nata 35% MG', stock: 25, reorderPoint: 40, demand7d: 35, status: 'warning', unit: 'L', price: 4.20, var3m: 4 },
  { id: 'i7', name: 'Queso Crema Philadelphia', stock: 50, reorderPoint: 20, demand7d: 15, status: 'ok', unit: 'kg', price: 6.50, var3m: 0 },
  { id: 'i8', name: 'Colorante Rojo Alimentario', stock: 2, reorderPoint: 1, demand7d: 0.5, status: 'ok', unit: 'L', price: 45.00, var3m: 2 },
];

export const recipes = [
  {
    id: 'r1',
    name: 'Tarta de Chocolate Valrhona',
    ingredients: [
      { id: 'i1', qty: 0.5 },
      { id: 'i2', qty: 0.3 },
      { id: 'i3', qty: 0.25 },
      { id: 'i4', qty: 0.4 },
      { id: 'i5', qty: 0.5 }, // 6 eggs = 0.5 dozen
    ],
    modMinutes: 45,
    energyOverhead: 2.50,
  },
  {
    id: 'r2',
    name: 'Red Velvet Premium',
    ingredients: [
      { id: 'i1', qty: 0.6 },
      { id: 'i3', qty: 0.2 },
      { id: 'i4', qty: 0.5 },
      { id: 'i5', qty: 0.33 }, // 4 eggs
      { id: 'i7', qty: 0.8 },
      { id: 'i8', qty: 0.02 },
    ],
    modMinutes: 60,
    energyOverhead: 3.00,
  },
  {
    id: 'r3',
    name: 'Torrijas Premium (Bandeja 6 uds)',
    ingredients: [
      { id: 'i1', qty: 0.8 }, // Pan brioche equivalent
      { id: 'i4', qty: 0.2 },
      { id: 'i5', qty: 0.5 },
      { id: 'i6', qty: 0.5 },
    ],
    modMinutes: 30,
    energyOverhead: 1.50,
  }
];

export const batches = [
  { id: 'LOT-2026-0315-HARINA-001', provider: 'Harinas de Castilla', reception: '2026-03-15', expiry: '2026-09-15', status: 'ok', progress: 10 },
  { id: 'LOT-2026-0220-CACAO-042', provider: 'Valrhona España', reception: '2026-02-20', expiry: '2026-08-20', status: 'ok', progress: 15 },
  { id: 'LOT-2026-0401-MANT-012', provider: 'Lácteos Asturianos', reception: '2026-04-01', expiry: '2026-05-01', status: 'warning', progress: 85 },
  { id: 'LOT-2026-0410-NATA-005', provider: 'Lácteos Asturianos', reception: '2026-04-10', expiry: '2026-04-25', status: 'critical', progress: 95 },
];
