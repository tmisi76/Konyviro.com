import { useState, useEffect } from "react";

const SIDEBAR_STORAGE_KEY = "dashboard-sidebar-collapsed";

export function useSidebarState(defaultCollapsed = false) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return defaultCollapsed;
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored !== null ? JSON.parse(stored) : defaultCollapsed;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggle = () => setIsCollapsed((prev: boolean) => !prev);

  return { isCollapsed, setIsCollapsed, toggle };
}
