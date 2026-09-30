import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EventType = 'bake' | 'delivery' | 'consultation';
export type OrderStatus = 'Inquiry' | 'Confirmed' | 'In Production' | 'Ready' | 'Delivered';
export type OrderCategory = 'Wedding' | 'Birthday' | 'Custom' | 'Shower' | 'Corporate';

export interface CalendarEvent {
  id: string;
  type: EventType;
  clientName: string;
  cakeName: string;
  date: string; // ISO date (yyyy-MM-dd)
  time?: string; // kept for backwards compat
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  bakeDurationDays?: number;
  bakeDurationHours?: number;
  durationHours?: number; // for delivery & consultation time tracking
  notes?: string;
}

export interface Order {
  id: string;
  clientName: string;
  contact: string;
  cakeName: string;
  tiers: number;
  servings: number;
  price: number;
  flavor: string;
  finish: string;
  dietaryRestrictions: string;
  designNotes: string;
  deliveryDate: string;
  consultationDate?: string;
  status: OrderStatus;
  categories: OrderCategory[];
  referencePhotos: string[];
  depositAmount: number;
  depositPaid: boolean;
  balancePaid: boolean;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  price: number;
  unitSize: string;
  category: string;
}

export interface SavedEstimate {
  id: string;
  clientName: string;
  cakeName: string;
  tiers: number;
  servings: number;
  dateSaved: string;
  totalCost: number;
  quotedPrice: number;
  margin: number;
  tierIngredients: Record<number, EstimateIngredient[]>;
  laborHours: number;
  laborRate: number;
  packaging: number;
  misc: number;
}

export interface EstimateIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
}

const DEFAULT_INGREDIENTS: Ingredient[] = [
  { id: '1', name: 'All-Purpose Flour', price: 3.50, unitSize: '5 lb', category: 'Flour & dry' },
  { id: '2', name: 'Cake Flour', price: 4.50, unitSize: '2 lb', category: 'Flour & dry' },
  { id: '3', name: 'Granulated Sugar', price: 3.00, unitSize: '4 lb', category: 'Sugar & sweeteners' },
  { id: '4', name: 'Powdered Sugar', price: 4.00, unitSize: '2 lb', category: 'Sugar & sweeteners' },
  { id: '5', name: 'Unsalted Butter', price: 5.50, unitSize: '1 lb', category: 'Fats & oils' },
  { id: '6', name: 'Heavy Cream', price: 4.50, unitSize: '1 qt', category: 'Dairy & eggs' },
  { id: '7', name: 'Eggs (dozen)', price: 4.00, unitSize: '12 unit', category: 'Dairy & eggs' },
  { id: '8', name: 'Vanilla Extract', price: 8.00, unitSize: '4 fl oz', category: 'Flavoring & extracts' },
  { id: '9', name: 'Cocoa Powder', price: 6.00, unitSize: '8 oz', category: 'Flavoring & extracts' },
  { id: '10', name: 'Cream Cheese', price: 3.50, unitSize: '8 oz', category: 'Dairy & eggs' },
  { id: '11', name: 'Fondant', price: 12.00, unitSize: '2 lb', category: 'Decoration & fondant' },
  { id: '12', name: 'Baking Powder', price: 3.00, unitSize: '10 oz', category: 'Flour & dry' },
  { id: '13', name: 'Salt', price: 1.50, unitSize: '26 oz', category: 'Flour & dry' },
  { id: '14', name: 'Vegetable Oil', price: 4.00, unitSize: '48 fl oz', category: 'Fats & oils' },
  { id: '15', name: 'Food Coloring Set', price: 10.00, unitSize: '4 unit', category: 'Decoration & fondant' },
];

interface AppState {
  events: CalendarEvent[];
  orders: Order[];
  ingredients: Ingredient[];
  savedEstimates: SavedEstimate[];
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  deleteOrder: (id: string) => void;
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (ingredient: Ingredient) => void;
  deleteIngredient: (id: string) => void;
  addEstimate: (estimate: SavedEstimate) => void;
  deleteEstimate: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      events: [],
      orders: [],
      ingredients: DEFAULT_INGREDIENTS,
      savedEstimates: [],
      addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
      updateEvent: (event) => set((s) => ({ events: s.events.map((e) => e.id === event.id ? event : e) })),
      deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      addOrder: (order) => set((s) => ({ orders: [...s.orders, order] })),
      updateOrder: (order) => set((s) => ({ orders: s.orders.map((o) => o.id === order.id ? order : o) })),
      deleteOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
      addIngredient: (ingredient) => set((s) => ({ ingredients: [...s.ingredients, ingredient] })),
      updateIngredient: (ingredient) => set((s) => ({ ingredients: s.ingredients.map((i) => i.id === ingredient.id ? ingredient : i) })),
      deleteIngredient: (id) => set((s) => ({ ingredients: s.ingredients.filter((i) => i.id !== id) })),
      addEstimate: (estimate) => set((s) => ({ savedEstimates: [...s.savedEstimates, estimate] })),
      deleteEstimate: (id) => set((s) => ({ savedEstimates: s.savedEstimates.filter((e) => e.id !== id) })),
    }),
    { name: 'cakecal-store' }
  )
);

export const formatCurrency = (amount: number) => {
  if (Number.isInteger(amount)) return `$${amount.toLocaleString()}`;
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const getDaysUntil = (dateStr: string) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export const generateId = () => Math.random().toString(36).substring(2, 15);
