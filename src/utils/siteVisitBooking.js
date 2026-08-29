import { apiUrl } from './apiBase.js';
import { brokerSlotUnavailable } from './voiceAgentLogic.js';

export const SITE_VISIT_TIME_SLOTS = [
  '10:00 AM - 11:00 AM',
  '11:30 AM - 12:30 PM',
  '02:00 PM - 03:00 PM',
  '04:00 PM - 05:00 PM'
];

export async function fetchBrokerSlotAvailability(visitDate) {
  const statusMap = {};
  for (const slot of SITE_VISIT_TIME_SLOTS) {
    try {
      const res = await fetch(
        apiUrl(`/api/brokers/availability?visit_date=${visitDate}&time_slot=${encodeURIComponent(slot)}`)
      );
      const data = await res.json();
      statusMap[slot] = {
        is_available: data.is_available,
        available_count: data.available_count || 0
      };
    } catch {
      statusMap[slot] = brokerSlotUnavailable();
    }
  }
  return statusMap;
}

export function getPropertyAskingPrice(property) {
  if (!property) return 'N/A';
  if (property.listing_type === 'sale' && property.sale_price_inr) {
    return `₹${(property.sale_price_inr / 10000000).toFixed(2)} Cr`;
  }
  if (property.rent_inr) {
    return `₹${property.rent_inr.toLocaleString('en-IN')}/mo`;
  }
  return 'N/A';
}

export async function submitSiteVisitRequest(property, draft) {
  const res = await fetch(apiUrl('/api/schedule-site-visit'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_name: draft.name,
      user_email: draft.email,
      phone: draft.phone,
      visit_date: draft.visitDate,
      time_slot: draft.timeSlot,
      property_title: property.society_name,
      locality: property.locality,
      price: getPropertyAskingPrice(property)
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Booking failed (${res.status})`);
  }
  if (!data.success) {
    throw new Error(data.message || 'All brokers are busy for this slot.');
  }
  return data;
}
