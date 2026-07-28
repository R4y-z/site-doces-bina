// Converte linhas do D1 (snake_case, booleans como 0/1) para o formato
// camelCase consumido pelo front-end.

export function toBool(v: unknown): boolean {
  return v === 1 || v === true || v === "1";
}

export function mapCategory(row: any) {
  return {
    id: row.id as number,
    name: row.name as string,
    slug: row.slug as string,
    sortOrder: row.sort_order as number,
    active: toBool(row.active),
  };
}

export function mapAddonOption(row: any) {
  return {
    id: row.id as number,
    groupId: row.group_id as number,
    name: row.name as string,
    priceCents: row.price_cents as number,
    active: toBool(row.active),
    sortOrder: row.sort_order as number,
  };
}

export function mapAddonGroup(row: any, options: any[] = []) {
  return {
    id: row.id as number,
    productId: row.product_id as number,
    name: row.name as string,
    required: toBool(row.required),
    multiple: toBool(row.multiple),
    minSelect: row.min_select as number,
    maxSelect: row.max_select as number,
    sortOrder: row.sort_order as number,
    options: options.map(mapAddonOption),
  };
}

export function mapProduct(row: any, addonGroups: ReturnType<typeof mapAddonGroup>[] = []) {
  return {
    id: row.id as number,
    categoryId: row.category_id as number,
    name: row.name as string,
    slug: row.slug as string,
    description: (row.description as string) ?? "",
    priceCents: row.price_cents as number,
    imageUrl: row.image_url as string | null,
    featured: toBool(row.featured),
    active: toBool(row.active),
    sortOrder: row.sort_order as number,
    addonGroups,
  };
}

export function mapPublicSettings(row: any) {
  return {
    storeName: row.store_name as string,
    tagline: row.tagline as string | null,
    logoUrl: row.logo_url as string | null,
    bannerUrl: row.banner_url as string | null,
    isOpen: toBool(row.is_open),
    address: row.address as string | null,
    hoursText: row.hours_text as string | null,
    whatsappNumber: row.whatsapp_number as string | null,
    deliveryFeeCents: row.delivery_fee_cents as number,
    minOrderCents: row.min_order_cents as number,
    pixKey: row.pix_key as string | null,
    pixKeyType: row.pix_key_type as string | null,
    pixQrUrl: row.pix_qr_url as string | null,
  };
}

export function mapOrder(row: any, items: any[] = []) {
  return {
    id: row.id as number,
    publicCode: row.public_code as string,
    customerName: row.customer_name as string,
    customerPhone: row.customer_phone as string,
    deliveryType: row.delivery_type as "pickup" | "delivery",
    address: row.address as string | null,
    neighborhood: row.neighborhood as string | null,
    referencePoint: row.reference_point as string | null,
    paymentMethod: row.payment_method as "pix" | "card" | "cash",
    changeForCents: row.change_for_cents as number | null,
    notes: row.notes as string | null,
    subtotalCents: row.subtotal_cents as number,
    deliveryFeeCents: row.delivery_fee_cents as number,
    totalCents: row.total_cents as number,
    status: row.status as string,
    createdAt: row.created_at as string,
    items,
  };
}

export function mapOrderItem(row: any, addons: any[] = []) {
  return {
    id: row.id as number,
    productId: row.product_id as number | null,
    productName: row.product_name as string,
    unitPriceCents: row.unit_price_cents as number,
    quantity: row.quantity as number,
    notes: row.notes as string | null,
    addons: addons.map((a) => ({ name: a.addon_name as string, priceCents: a.price_cents as number })),
  };
}
