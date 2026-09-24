"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getDemoCartSnapshot,
  getDemoQuoteRequestsSnapshot,
  subscribeDemoStore,
  type DemoCartItem,
  type DemoQuoteRequest,
} from "./demo-store";

const EMPTY_SNAPSHOT = "[]";

function parseList<T>(snapshot: string): T[] {
  try {
    const value = JSON.parse(snapshot);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function useDemoCart() {
  const snapshot = useSyncExternalStore(
    subscribeDemoStore,
    getDemoCartSnapshot,
    () => EMPTY_SNAPSHOT,
  );
  return useMemo(() => parseList<DemoCartItem>(snapshot), [snapshot]);
}

export function useDemoQuoteRequests() {
  const snapshot = useSyncExternalStore(
    subscribeDemoStore,
    getDemoQuoteRequestsSnapshot,
    () => EMPTY_SNAPSHOT,
  );
  return useMemo(() => parseList<DemoQuoteRequest>(snapshot), [snapshot]);
}
