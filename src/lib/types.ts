// ============================================================
// FÁBRICA DE ARCADES — TypeScript Types
// ============================================================

export type UserRole = 'admin' | 'fabricante' | 'distribuidor' | 'cliente'

export type ProductType = 'arcade' | 'accessory' | 'bundle'

export type StockType = 'immediate' | 'printed' | 'designed' | 'none'

export type SupplyType = 'button' | 'joystick' | 'vinyl' | 'led' | 'other'

export type CabinetType = 'vertical' | 'horizontal' | 'bartop' | 'pedestal' | 'cocktail'

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'pending' | 'current_account'

export type OrderStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'in_production'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'

export type ProductionStatus = 'pending' | 'in_progress' | 'finished' | 'dispatched'

export type NotificationType =
  | 'new_order'
  | 'order_confirmed'
  | 'production_started'
  | 'production_finished'
  | 'order_dispatched'
  | 'order_delivered'
  | 'distributor_approved'
  | 'low_stock'
  | 'stock_alert'

// ============================================================
// DATABASE TYPES
// ============================================================

export interface UserProfile {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  company_name: string | null
  distributor_approved: boolean
  distributor_requested: boolean
  current_account_enabled: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  slug: string
  name: string
  short_description: string | null
  description: string | null
  category_id: string | null
  product_type: ProductType
  requires_production: boolean
  base_price: number
  retail_markup_pct: number
  images: string[]
  video_url: string | null
  is_featured: boolean
  is_active: boolean
  sort_order: number
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
  // Joined
  category?: Category
  stock_summary?: StockSummary
}

export interface ProductVariant {
  id: string
  product_id: string
  cabinet_type: CabinetType | null
  screen_size: string | null
  price_modifier: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface SupplyFamily {
  id: string
  name: string
  supply_type: SupplyType
  description: string | null
  created_at: string
}

export interface SupplyInventory {
  id: string
  name: string
  supply_type: SupplyType
  family_id?: string | null
  color: string | null
  color_label: string | null
  image_url: string | null
  quantity: number
  unit: string
  low_stock_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
  family?: SupplyFamily
}

export interface StockItem {
  id: string
  product_id: string
  variant_id: string | null
  vinyl_supply_id: string | null
  stock_type: StockType
  quantity: number
  configuration?: ArcadeCustomization
  updated_at: string
}

export interface StockSummary {
  immediate: number
  printed: number
  designed: number
  total: number
  availability: StockType
}

export interface Order {
  id: string
  order_number: string
  user_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_role_snapshot: string
  status: OrderStatus
  payment_method: PaymentMethod | null
  payment_status: 'pending' | 'paid' | 'refunded'
  payment_reference: string | null
  subtotal: number
  discount_amount: number
  payment_surcharge_amount: number
  total: number
  shipping_address: ShippingAddress | null
  estimated_delivery_date: string | null
  notes: string | null
  admin_notes: string | null
  reservation_status: 'active' | 'committed' | 'released' | 'expired'
  reservation_expires_at: string | null
  cancellation_resolution: 'pending' | 'restock' | 'disassemble' | null
  created_at: string
  updated_at: string
  // Joined
  items?: OrderItem[]
}

export interface ShippingAddress {
  delivery_method?: 'pickup' | 'shipping'
  shipping_mode?: 'local_moto_flete' | 'transporte_correo' | 'coordinar' | null
  shipping_payment?: 'destination' | null
  street: string
  city: string
  province: string
  zip: string
  notes?: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string | null
  quantity: number
  unit_price: number
  subtotal: number
  stock_type_at_purchase: StockType | null
  customization: ArcadeCustomization
  fulfillment_type: 'ready_stock' | 'custom'
  stock_item_id: string | null
  reservation_status: 'active' | 'committed' | 'released' | 'expired'
  created_at: string
  // Joined
  product?: Product
  variant?: ProductVariant
}

export interface PlayerCustomization {
  joystick_supply_id?: string
  joystick_color?: string
  button_supply_ids?: string[]
  button_supply_id?: string
  button_color?: string
  button_count?: number
}

export interface ArcadeCustomization {
  cabinet_type?: CabinetType
  screen_size?: string
  joystick_count?: number
  joystick_type?: 'standard' | 'led'
  joystick_supply_id?: string
  joystick_color?: string
  button_count?: number
  button_type?: 'standard' | 'led'
  button_supply_ids?: string[]
  button_supply_id?: string
  button_color?: string
  button_colors?: string[]
  led_supply_id?: string
  led_color?: string
  vinyl_supply_id?: string
  vinyl_name?: string
  vinyl_source?: 'stock' | 'custom' | 'print'
  control_type?: 'standard' | 'led'
  addons?: Array<{ id: string; name: string; price: number }>
  players?: PlayerCustomization[]
}

export interface ProductionQueueItem {
  id: string
  order_item_id: string
  order_id: string
  status: ProductionStatus
  priority: number
  assigned_to: string | null
  notes: string | null
  product_name: string
  customization_summary: string | null
  started_at: string | null
  finished_at: string | null
  dispatched_at: string | null
  created_at: string
  updated_at: string
  // Joined
  order?: Order
  order_item?: OrderItem
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  is_read: boolean
  related_order_id: string | null
  related_production_id: string | null
  action_url: string | null
  created_at: string
}

export interface DeliveryConfig {
  key: string
  value: string
  label: string | null
  updated_at: string
}

// ============================================================
// CART TYPES
// ============================================================

export interface CartItem {
  id: string // local UUID
  product: Product
  variant?: ProductVariant
  quantity: number
  unit_price: number
  customization: ArcadeCustomization
  stock_type: StockType
  stock_item_id?: string
  fulfillment_type: 'ready_stock' | 'custom'
}

export interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  total: () => number
  itemCount: () => number
}

// ============================================================
// UI TYPES
// ============================================================

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

export interface ToastState {
  toasts: Toast[]
  add: (toast: Omit<Toast, 'id'>) => void
  remove: (id: string) => void
}

export type StockBadgeConfig = {
  label: string
  className: string
  icon: string
  deliveryText: string
}

export const STOCK_BADGE_CONFIG: Record<StockType, StockBadgeConfig> = {
  immediate: {
    label: 'Entrega inmediata',
    className: 'badge-immediate',
    icon: '✓',
    deliveryText: 'Entrega inmediata',
  },
  printed: {
    label: 'Listo en 24 hs',
    className: 'badge-printed',
    icon: '⏱',
    deliveryText: '24 horas hábiles',
  },
  designed: {
    label: 'A pedido',
    className: 'badge-designed',
    icon: '🎨',
    deliveryText: '7 días hábiles',
  },
  none: {
    label: 'A pedido',
    className: 'badge-designed',
    icon: '🎨',
    deliveryText: 'Consultar disponibilidad',
  },
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending_confirmation: { label: 'Pendiente de pago', color: 'amber' },
  confirmed: { label: 'Confirmado', color: 'cyan' },
  in_production: { label: 'En producción', color: 'purple' },
  ready: { label: 'Listo', color: 'green' },
  dispatched: { label: 'Despachado', color: 'blue' },
  delivered: { label: 'Entregado', color: 'green' },
  cancelled: { label: 'Cancelado', color: 'red' },
}

export const PRODUCTION_STATUS_CONFIG: Record<
  ProductionStatus,
  { label: string; color: string; icon: string }
> = {
  pending: { label: 'Pendiente', color: 'amber', icon: '⏳' },
  in_progress: { label: 'En producción', color: 'purple', icon: '🔧' },
  finished: { label: 'Terminado', color: 'green', icon: '✅' },
  dispatched: { label: 'Despachado', color: 'cyan', icon: '🚚' },
}

export const CABINET_TYPE_LABELS: Record<CabinetType, string> = {
  vertical: 'Vertical (Upright)',
  horizontal: 'Horizontal (Cocktail)',
  bartop: 'Bartop',
  pedestal: 'Pedestal',
  cocktail: 'Cocktail Table',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia bancaria',
  card: 'Tarjeta de crédito',
  pending: 'A definir',
  current_account: 'Cuenta corriente',
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getEffectivePrice(product: Product, role: UserRole): number {
  if (role === 'admin' || role === 'distribuidor') {
    return product.base_price
  }
  return product.base_price * (1 + product.retail_markup_pct / 100)
}

export function getProductPlayers(product: Product): number {
  if (product.product_type !== 'arcade') return 1
  const name = product.name.toLowerCase()
  const desc = (product.description || '').toLowerCase()
  const shortDesc = (product.short_description || '').toLowerCase()
  
  if (name.includes('4p') || name.includes('4 player') || name.includes('4 jugadores') || desc.includes('4 jugadores') || shortDesc.includes('4 jugadores')) {
    return 4
  }
  if (name.includes('1p') || name.includes('1 player') || name.includes('1 jugador') || desc.includes('1 jugador') || shortDesc.includes('1 jugador')) {
    return 1
  }
  return 2 // Default to 2 players for arcades
}
