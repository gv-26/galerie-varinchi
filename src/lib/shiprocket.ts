export const dynamic = 'force-dynamic';

let shiprocketToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getShiprocketToken(): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL || 'kiran.geo96@gmail.com';
  const password = process.env.SHIPROCKET_PASSWORD || '5RFmcLiI6&kTY8LGBG%1%KNaZ%Z!qlCf';

  if (shiprocketToken && Date.now() < tokenExpiresAt) {
    return shiprocketToken;
  }

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Shiprocket Auth Error:', text);
    throw new Error('Failed to authenticate with Shiprocket');
  }

  const data = await res.json();
  shiprocketToken = data.token;
  // Token is valid for 10 days, refresh after 9 days
  tokenExpiresAt = Date.now() + (9 * 24 * 60 * 60 * 1000);
  
  return shiprocketToken!;
}

function extractPincode(address: string | null): string {
  if (!address) return '110001';
  const match = address.match(/\b\d{6}\b/);
  return match ? match[0] : '110001';
}

export async function createShiprocketOrder(params: {
  orderId: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  subTotal: number;
  items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    weight: number;    // per item in kg
    length: number;    // per item in cm
    width: number;     // per item in cm
    height: number;    // per item in cm
  }>;
}) {
  const token = await getShiprocketToken();
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary';
  
  const names = params.customerName?.split(' ') || ['Customer'];
  const firstName = names[0] || 'Customer';
  const lastName = names.length > 1 ? names.slice(1).join(' ') : 'Name';
  
  const pincode = extractPincode(params.customerAddress);

  // Aggregate dimensions and weight conservatively
  let totalWeight = 0;
  let maxL = 10, maxW = 10, maxH = 10;
  
  params.items.forEach(item => {
    totalWeight += (item.weight || 0.5) * item.units;
    if ((item.length || 10) > maxL) maxL = item.length || 10;
    if ((item.width || 10) > maxW) maxW = item.width || 10;
    if ((item.height || 10) > maxH) maxH = item.height || 10;
  });

  // Minimums for Shiprocket
  if (totalWeight <= 0) totalWeight = 0.5;

  const payload = {
    order_id: params.orderId,
    order_date: params.orderDate,
    pickup_location: pickupLocation,
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: params.customerAddress || 'No Address Provided',
    billing_city: 'Unknown', // Fallback as we don't have separate city field
    billing_pincode: pincode,
    billing_state: 'Unknown',
    billing_country: 'India',
    billing_email: params.customerEmail || 'test@test.com',
    billing_phone: params.customerPhone || '9999999999',
    shipping_is_billing: true,
    order_items: params.items.map(i => ({
      name: i.name,
      sku: i.sku || i.name.substring(0, 5),
      units: i.units,
      selling_price: i.selling_price
    })),
    payment_method: 'Prepaid',
    sub_total: params.subTotal,
    length: maxL,
    breadth: maxW,
    height: maxH,
    weight: totalWeight
  };

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Shiprocket Create Order Error:', errorText);
    throw new Error('Failed to create Shiprocket Order: ' + errorText);
  }

  const data = await res.json();
  return {
    shiprocketOrderId: data.order_id,
    shipmentId: data.shipment_id,
  };
}

export async function assignAWB(shipmentId: number) {
  const token = await getShiprocketToken();
  const res = await fetch('https://apiv2.shiprocket.in/v1/external/courier/assign/awb', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      shipment_id: shipmentId
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Shiprocket AWB Assignment Error:', errorText);
    // Shiprocket returns 404/400 if serviceability fails.
    // Better to return null and let admin assign manually rather than blocking checkout
    return null; 
  }

  const data = await res.json();
  if (data.response && data.response.data) {
    const validData = data.response.data;
    return {
      awbNumber: validData.awb_code,
      courierName: validData.courier_name,
      courierId: validData.courier_company_id
    };
  }
  return null;
}

export async function schedulePickup(shipmentId: number) {
  const token = await getShiprocketToken();
  const res = await fetch('https://apiv2.shiprocket.in/v1/external/courier/generate/pickup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      shipment_id: [shipmentId]
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Shiprocket Pickup Generation Server Error:', errorText);
    return false;
  }
  return true;
}
