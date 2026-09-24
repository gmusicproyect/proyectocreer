"use client";

import Link from "next/link";
import { useDemoCart } from "@/modules/quotations/use-demo-store";

export function CartLink() {
  const cart = useDemoCart();
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <Link className="button outline" href="/orcamento">
      Meu orçamento <span className="count">{itemCount}</span>
    </Link>
  );
}
