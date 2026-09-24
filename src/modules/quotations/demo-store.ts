"use client";

const CART_KEY = "creer-demo-cart-v1";
const REQUESTS_KEY = "creer-demo-requests-v1";
const STORE_EVENT = "creer-demo-store";

export interface DemoCartItem {
  id: string;
  code: string;
  name: string;
  image: string;
  color: string;
  quantity: number;
  personalization: string;
}

export interface DemoQuoteCustomer {
  name: string;
  company: string;
  email: string;
  phone: string;
}

export interface DemoQuoteRequest {
  id: string;
  createdAt: string;
  status: "Nova";
  customer: DemoQuoteCustomer;
  notes: string;
  items: DemoCartItem[];
}

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveList<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function getDemoCart() {
  return readList<DemoCartItem>(CART_KEY);
}

export function getDemoCartSnapshot() {
  return typeof window === "undefined"
    ? "[]"
    : (window.localStorage.getItem(CART_KEY) ?? "[]");
}

export function addDemoCartItem(item: Omit<DemoCartItem, "id">) {
  const cart = getDemoCart();
  const matchingIndex = cart.findIndex(
    (current) =>
      current.code === item.code &&
      current.color === item.color &&
      current.personalization === item.personalization,
  );

  if (matchingIndex >= 0) {
    cart[matchingIndex] = {
      ...cart[matchingIndex],
      quantity: cart[matchingIndex].quantity + item.quantity,
    };
  } else {
    cart.push({ ...item, id: `${item.code}-${Date.now()}` });
  }
  saveList(CART_KEY, cart);
}

export function updateDemoCartQuantity(id: string, quantity: number) {
  const cart = getDemoCart().map((item) =>
    item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item,
  );
  saveList(CART_KEY, cart);
}

export function removeDemoCartItem(id: string) {
  saveList(
    CART_KEY,
    getDemoCart().filter((item) => item.id !== id),
  );
}

export function clearDemoCart() {
  saveList<DemoCartItem>(CART_KEY, []);
}

export function getDemoQuoteRequests() {
  return readList<DemoQuoteRequest>(REQUESTS_KEY);
}

export function getDemoQuoteRequestsSnapshot() {
  return typeof window === "undefined"
    ? "[]"
    : (window.localStorage.getItem(REQUESTS_KEY) ?? "[]");
}

export function createDemoQuoteRequest(
  customer: DemoQuoteCustomer,
  notes: string,
) {
  const now = new Date();
  const request: DemoQuoteRequest = {
    id: `CR-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${String(
      getDemoQuoteRequests().length + 1,
    ).padStart(3, "0")}`,
    createdAt: now.toISOString(),
    status: "Nova",
    customer,
    notes,
    items: getDemoCart(),
  };
  saveList(REQUESTS_KEY, [request, ...getDemoQuoteRequests()]);
  clearDemoCart();
  return request;
}

export function subscribeDemoStore(listener: () => void) {
  window.addEventListener(STORE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(STORE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
