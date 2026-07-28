export interface AddonOption {
  id: number;
  groupId: number;
  name: string;
  priceCents: number;
  active: boolean;
  sortOrder: number;
}

export interface AddonGroup {
  id: number;
  productId: number;
  name: string;
  required: boolean;
  multiple: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  options: AddonOption[];
}

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  featured: boolean;
  active: boolean;
  sortOrder: number;
  addonGroups: AddonGroup[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
}

export interface StoreSettings {
  storeName: string;
  tagline: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  isOpen: boolean;
  address: string | null;
  hoursText: string | null;
  whatsappNumber: string | null;
  deliveryFeeCents: number;
  minOrderCents: number;
  pixKey: string | null;
  pixKeyType: string | null;
  pixQrUrl: string | null;
}

export interface MenuResponse {
  settings: StoreSettings | null;
  categories: Category[];
  products: Product[];
}

export type DeliveryType = "pickup" | "delivery";
export type PaymentMethod = "pix" | "card" | "cash";

export interface CartAddon {
  optionId: number;
  name: string;
  priceCents: number;
}

export interface CartItem {
  cartItemId: string;
  productId: number;
  name: string;
  imageUrl: string | null;
  basePriceCents: number;
  quantity: number;
  addons: CartAddon[];
  notes: string;
}

export interface OrderItemDTO {
  id: number;
  productId: number | null;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  notes: string | null;
  addons: { name: string; priceCents: number }[];
}

export interface OrderDTO {
  id: number;
  publicCode: string;
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  address: string | null;
  neighborhood: string | null;
  referencePoint: string | null;
  paymentMethod: PaymentMethod;
  changeForCents: number | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  status: string;
  createdAt: string;
  items: OrderItemDTO[];
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  received: "Recebido",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  out_for_delivery: "Saiu para entrega",
  ready: "Pronto para retirada",
  completed: "Concluído",
  cancelled: "Cancelado",
};
