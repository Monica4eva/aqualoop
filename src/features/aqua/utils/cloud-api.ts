import type {
  ChatMessage,
  Household,
  Product,
} from "@/features/aqua/types/aqua";

const CLOUD_API_URL =
  process.env.EXPO_PUBLIC_CLOUD_API_URL || "http://127.0.0.1:8082";

interface CloudHousehold {
  household_id: string;
  label: string;
  contact_name: string;
  phone: string;
  area: Household["area"];
  address: string;
  usual_run: Household["usualRun"];
  reminders_opt_in: boolean;
  active: boolean;
}

export async function fetchCloudHouseholds(): Promise<Household[]> {
  const response = await fetch(`${CLOUD_API_URL}/api/households`);

  if (!response.ok) {
    throw new Error(`Cloud API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !Array.isArray(data.households)) {
    throw new Error("Invalid household data received");
  }

  return data.households.map((row: CloudHousehold) => ({
    id: row.household_id,
    label: row.label,
    contact: row.contact_name,
    phone: row.phone,
    area: row.area,
    address: row.address,
    usualRun: row.usual_run,
    reminders: row.reminders_opt_in,
    active: row.active,
  }));
}

export interface CloudOrderInput {
  request_id: string;
  household_id: string;
  delivery_date: string | null;
  run: "morning" | "afternoon";
  intent: "new" | "change" | "skip" | "cancel" | "return_only" | "query";
  quantity: number | null;
  returns_requested: number;
  source: "standing" | "one_off" | "pickup_only";
  message_text: string;
  confidence: number;
  review_reasons: string[];
  items: {
    productId: string;
    qty: number;
  }[];
  return_details: Record<string, number>;
}

export async function saveCloudOrder(order: CloudOrderInput) {
  const response = await fetch(`${CLOUD_API_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    throw new Error(`Cloud order save failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.order) {
    throw new Error("Invalid cloud order response");
  }

  return data.order;
}

export async function fetchCloudOrders() {
  const response = await fetch(`${CLOUD_API_URL}/api/orders`);

  if (!response.ok) {
    throw new Error(`Cloud order retrieval failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !Array.isArray(data.orders)) {
    throw new Error("Invalid cloud orders response");
  }

  return data.orders;
}

export function buildCloudOrder(
  message: ChatMessage,
  products: Product[],
  requestId: string,
): CloudOrderInput | null {
  const result = message.result;

  if (!result || !message.householdId) {
    return null;
  }

  const { parsed, resolution } = result;
  const intent = parsed.intent;

  if (
    intent !== "new" &&
    intent !== "change" &&
    intent !== "skip" &&
    intent !== "cancel" &&
    intent !== "return_only"
  ) {
    return null;
  }

  if (result.route === "duplicate") {
    return null;
  }

  const quantity = resolution.lines.reduce((total, line) => {
    const product = products.find((p) => p.id === line.productId);

    return product?.container === "20L_container" ? total + line.qty : total;
  }, 0);

  return {
    request_id: requestId,
    household_id: message.householdId,
    delivery_date: resolution.date,
    run: resolution.run,
    intent,
    quantity: resolution.lines.length ? quantity : null,
    returns_requested: resolution.returns["20L_container"] ?? 0,
    source: intent === "return_only" ? "pickup_only" : parsed.scope,
    message_text: message.text,
    confidence: parsed.confidence,
    review_reasons: result.rules,
    items: resolution.lines,
    return_details: resolution.returns,
  };
}

export async function updateCloudOrderStatus(
  orderId: string,
  status: "confirmed" | "rejected",
  edit?: {
    delivery_date: string;
    run: "morning" | "afternoon";
    quantity: number;
    items: { productId: string; qty: number }[];
  },
) {
  const response = await fetch(
    `${CLOUD_API_URL}/api/orders/${encodeURIComponent(orderId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, edit }),
    },
  );

  if (!response.ok) {
    throw new Error(`Cloud order update failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.order) {
    throw new Error("Invalid order update response");
  }

  return data.order;
}
export async function parseCloudMessage(text: string): Promise<{
  parsed: import("@/features/aqua/types/aqua").ParsedOrder;
  parser: string;
}> {
  const response = await fetch(`${CLOUD_API_URL}/api/parse-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Gemini processing failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.parsed) {
    throw new Error("Invalid Gemini response");
  }

  return {
    parsed: data.parsed,
    parser: "Gemini",
  };
}
