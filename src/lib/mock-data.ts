export const mockCategories: any[] = [
  { id: 'cat-1', name: 'Arcades', slug: 'arcades', description: null, is_active: true, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-2', name: 'Accesorios', slug: 'accesorios', description: null, is_active: true, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const mockProducts: any[] = [
  {
    id: 'prod-1',
    name: 'Arcade Classic Vertical',
    slug: 'arcade-classic-vertical',
    short_description: 'El clásico mueble vertical de los 90s, ahora en tu casa.',
    description: 'Mueble fabricado en MDF de 15mm, ploteado completo. Incluye sistema con más de 10.000 juegos, pantalla LED de 24" y controles profesionales.',
    category_id: 'cat-1',
    product_type: 'arcade',
    base_price: 350000,
    retail_markup_pct: 30,
    images: ['/productos/arcade-2.jpg', '/productos/arcade-3.jpg'],
    requires_production: true,
    is_active: true,
    is_featured: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: mockCategories[0],
  },
  {
    id: 'prod-2',
    name: 'Arcade Bartop',
    slug: 'arcade-bartop',
    short_description: 'Tamaño compacto, diversión gigante.',
    description: 'Ideal para poner sobre una mesa o barra. Mismo hardware que la versión vertical pero en formato compacto. Pantalla de 19".',
    category_id: 'cat-1',
    product_type: 'arcade',
    base_price: 280000,
    retail_markup_pct: 30,
    images: ['/productos/arcade-8.png', '/productos/arcade-9.png'],
    requires_production: true,
    is_active: true,
    is_featured: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: mockCategories[0],
  },
  {
    id: 'prod-3',
    name: 'Tablero Arcade Doble',
    slug: 'tablero-arcade-doble',
    short_description: 'Conectalo a tu TV y empezá a jugar.',
    description: 'Tablero de control doble con sistema integrado. Salida HDMI directo al televisor.',
    category_id: 'cat-1',
    product_type: 'arcade',
    base_price: 150000,
    retail_markup_pct: 30,
    images: ['/productos/arcade-4.jpg'],
    requires_production: true,
    is_active: true,
    is_featured: true,
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: mockCategories[0],
  },
  {
    id: 'prod-4',
    name: 'Kit de Botones Iluminados',
    slug: 'kit-botones-iluminados',
    short_description: 'Kit de 16 botones LED con interfaz USB.',
    description: 'Actualizá tu arcade con estos botones translúcidos con iluminación LED integrada.',
    category_id: 'cat-2',
    product_type: 'accessory',
    base_price: 45000,
    retail_markup_pct: 40,
    images: ['/productos/arcade-5.jpg'],
    requires_production: false,
    is_active: true,
    is_featured: false,
    sort_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: mockCategories[1],
  },
]

export const mockStockItems: any[] = [
  { id: 'stock-1', product_id: 'prod-1', variant_id: null, stock_type: 'immediate', quantity: 2, updated_at: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'stock-2', product_id: 'prod-1', variant_id: null, stock_type: 'printed', quantity: 5, updated_at: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'stock-3', product_id: 'prod-2', variant_id: null, stock_type: 'designed', quantity: 10, updated_at: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'stock-4', product_id: 'prod-3', variant_id: null, stock_type: 'immediate', quantity: 0, updated_at: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'stock-5', product_id: 'prod-3', variant_id: null, stock_type: 'printed', quantity: 2, updated_at: new Date().toISOString(), created_at: new Date().toISOString() },
  { id: 'stock-6', product_id: 'prod-4', variant_id: null, stock_type: 'immediate', quantity: 15, updated_at: new Date().toISOString(), created_at: new Date().toISOString() },
]

export const mockVariants: any[] = [
  { id: 'var-1', product_id: 'prod-1', cabinet_type: 'Vertical', screen_size: '24"', is_active: true, price_modifier: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'var-2', product_id: 'prod-1', cabinet_type: 'Vertical', screen_size: '32"', is_active: true, price_modifier: 50000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'var-3', product_id: 'prod-2', cabinet_type: 'Bartop', screen_size: '19"', is_active: true, price_modifier: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const mockSupplies: any[] = [
  { id: 'sup-1', name: 'Palanca Roja', supply_type: 'joystick', color_label: 'Rojo', color: '#ff0000', quantity: 50, low_stock_threshold: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sup-2', name: 'Palanca Azul', supply_type: 'joystick', color_label: 'Azul', color: '#0000ff', quantity: 30, low_stock_threshold: 10, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sup-3', name: 'Botón Blanco', supply_type: 'button', color_label: 'Blanco', color: '#ffffff', quantity: 200, low_stock_threshold: 40, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sup-4', name: 'Botón Negro', supply_type: 'button', color_label: 'Negro', color: '#000000', quantity: 150, low_stock_threshold: 40, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'sup-5', name: 'Kit T-Molding', supply_type: 'other', color_label: 'Cyan', color: '#00ffff', quantity: 20, low_stock_threshold: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

// Assign stock summaries to mock products for the listing
mockProducts.forEach(prod => {
  const stock = mockStockItems.filter(s => s.product_id === prod.id)
  const immediate = stock.filter(s => s.stock_type === 'immediate').reduce((a, b) => a + b.quantity, 0)
  const printed = stock.filter(s => s.stock_type === 'printed').reduce((a, b) => a + b.quantity, 0)
  const designed = stock.filter(s => s.stock_type === 'designed').reduce((a, b) => a + b.quantity, 0)
  const total = immediate + printed + designed
  prod.stock_summary = {
    immediate,
    printed,
    designed,
    total,
    availability: immediate > 0 ? 'immediate' : printed > 0 ? 'printed' : designed > 0 ? 'designed' : 'none'
  }
})
