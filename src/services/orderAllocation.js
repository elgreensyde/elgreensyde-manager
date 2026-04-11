import supabase from '../lib/supabase';

export const ACTIVE_ORDER_STATUSES = ['Pending', 'Confirmed', 'Packed'];

export function buildReservedQuantities(items = []) {
  return items.reduce((reserved, item) => {
    const skuId = item?.sku_id;
    if (!skuId) return reserved;
    reserved[skuId] = (reserved[skuId] || 0) + parseFloat(item.quantity || 0);
    return reserved;
  }, {});
}

export async function loadReservedQuantities() {
  const { data, error } = await supabase
    .from('order_line_items')
    .select('sku_id, quantity, orders!inner(status)')
    .in('orders.status', ACTIVE_ORDER_STATUSES);

  if (error) throw error;
  return buildReservedQuantities(data || []);
}

export function getReservedQuantity(reservedQuantities, skuId) {
  return reservedQuantities[skuId] || 0;
}

export function getAvailableQuantity(sku, reservedQuantities = {}, extraReserved = 0) {
  const skuId = sku?.sku_id || sku?.id;
  const currentStock = parseFloat(sku?.current_stock || 0);
  const reserved = getReservedQuantity(reservedQuantities, skuId);
  return Math.max(0, currentStock - reserved - extraReserved);
}
