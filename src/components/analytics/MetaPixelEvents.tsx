import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  trackCompleteRegistration,
  trackPurchase,
} from "@/lib/metaPixel";

/**
 * Meta Pixel event tracker.
 * - A nyitóoldal és minden route automatikus PageView-t kap az index.html-ben
 *   inicializált pixel + a sima oldalbetöltés révén.
 * - Sikeres regisztráció: a /dashboard?registered=success URL kiváltja a
 *   CompleteRegistration eseményt.
 * - Sikeres fizetés: a /dashboard?subscription=success URL kiváltja a
 *   Purchase eseményt (Stripe successUrl).
 * Az esemény elküldése után a query paramot eltávolítjuk, hogy ne tüzeljen
 * újra reload-nál.
 */
export function MetaPixelEvents() {
  const location = useLocation();
  const navigate = useNavigate();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subscription = params.get("subscription");
    const registered = params.get("registered");

    let consumed = false;

    if (subscription === "success") {
      const key = `purchase:${location.pathname}`;
      if (!firedRef.current.has(key)) {
        firedRef.current.add(key);
        trackPurchase();
      }
      params.delete("subscription");
      consumed = true;
    }

    if (registered === "success") {
      const key = `register:${location.pathname}`;
      if (!firedRef.current.has(key)) {
        firedRef.current.add(key);
        trackCompleteRegistration();
      }
      params.delete("registered");
      consumed = true;
    }

    if (consumed) {
      const search = params.toString();
      navigate(
        { pathname: location.pathname, search: search ? `?${search}` : "" },
        { replace: true },
      );
    }
  }, [location.pathname, location.search, navigate]);

  return null;
}
