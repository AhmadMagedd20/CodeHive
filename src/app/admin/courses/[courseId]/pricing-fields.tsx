"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Price + discount inputs. The discount can be set EITHER as a percentage OR as
 * an exact target sale price — whichever you type, the other updates. The SALE
 * PRICE is the source of truth submitted to the server (field `salePrice`), so
 * a typed price is stored exactly and never drifts; the percent is a helper.
 */
function pctFromSale(list: number, sale: number): number | "" {
  if (!(list > 0) || !(sale >= 0) || sale >= list) return "";
  return Math.round((1 - sale / list) * 100);
}
function saleFromPct(list: number, pct: number): number | "" {
  if (!(list > 0) || !(pct > 0)) return "";
  return Math.round(list * (1 - Math.min(99, pct) / 100));
}

export function PricingFields({
  defaultPrice,
  defaultSalePrice,
}: {
  defaultPrice: number | ""; // EGP (major units)
  defaultSalePrice: number | ""; // EGP (major units)
}) {
  const [price, setPrice] = useState<number | "">(defaultPrice);
  const [sale, setSale] = useState<number | "">(defaultSalePrice);
  const [percent, setPercent] = useState<number | "">(
    defaultPrice !== "" && defaultSalePrice !== "" ? pctFromSale(defaultPrice, defaultSalePrice) : "",
  );

  const num = (v: string): number | "" => {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : "";
  };

  function onPrice(v: string) {
    const p = num(v);
    setPrice(p);
    // Sale price is sticky; recompute the percentage from it.
    setPercent(p !== "" && sale !== "" ? pctFromSale(p, sale) : "");
  }
  function onPercent(v: string) {
    const pct = num(v);
    setPercent(pct);
    setSale(price !== "" && pct !== "" ? saleFromPct(price, pct) : "");
  }
  function onSale(v: string) {
    const s = num(v);
    setSale(s);
    setPercent(price !== "" && s !== "" ? pctFromSale(price, s) : "");
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="max-w-[16rem] space-y-1.5">
        <Label htmlFor="price">Full course price (EGP)</Label>
        <Input
          id="price"
          name="price"
          inputMode="decimal"
          placeholder="1500"
          value={price}
          onChange={(e) => onPrice(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="discountPercent">Discount (% off)</Label>
          <Input
            id="discountPercent"
            inputMode="numeric"
            placeholder="0"
            value={percent}
            onChange={(e) => onPercent(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="salePrice">…or sale price (EGP)</Label>
          <Input
            id="salePrice"
            name="salePrice"
            inputMode="decimal"
            placeholder="—"
            value={sale}
            onChange={(e) => onSale(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Set a percentage, or type the exact price you want after the discount — the other updates to
        match, and the sale price you enter is what students pay. Leave both blank for full price.
      </p>
      <p className="text-xs text-muted-foreground">
        This is the price for the <span className="font-medium text-foreground">whole course</span>.
        To sell a single week on its own, use the{" "}
        <span className="font-medium text-foreground">Price</span> button on that week down in the
        Outline.
      </p>
    </div>
  );
}
