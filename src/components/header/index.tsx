import { useEffect, useState } from "react";
import { cn } from "drupal-canvas";

// Self-contained dark header per the Traverse portal design. The region still
// passes `displaySearchForm` plus `logo`/`menu` slots for backwards
// compatibility, but this design renders its own wordmark + nav, so those
// slots are intentionally not placed. (Once the region-config API is healthy
// again we can drop the slots from component.yml and the region.)
const NAV = [
  { key: "home", label: "Home", href: "/portal-home" },
  { key: "campaign", label: "Campaign", href: "/asset-library" },
  { key: "guidelines", label: "Guidelines", href: "/collection/component-library" },
  { key: "about", label: "About us", href: "/about-us" },
];

function useActiveKey() {
  const [key, setKey] = useState("home");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = window.location.pathname;
    if (p.includes("about")) setKey("about");
    else if (p.includes("asset") || p.includes("categor") || p.includes("bike"))
      setKey("campaign");
    else if (p.includes("collection") || p.includes("guideline"))
      setKey("guidelines");
    else setKey("home");
  }, []);
  return key;
}

const Wordmark = ({ compact = false }) => (
  <a
    href="/portal-home"
    className="flex flex-col leading-none no-underline"
    aria-label="Traverse Cycles"
  >
    <span
      className={cn(
        "font-extrabold tracking-wide text-white",
        compact ? "text-lg" : "text-xl",
      )}
    >
      TRAVERSE
    </span>
    <span
      className={cn(
        "font-semibold tracking-[0.28em] text-[#ec3013]",
        compact ? "text-[9px]" : "text-[10px]",
      )}
    >
      CYCLES
    </span>
  </a>
);

const Header = ({ displaySearchForm = true }) => {
  const active = useActiveKey();

  return (
    <header className="w-full bg-[#0d1117] px-8">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-10 gap-y-3 py-4">
        <Wordmark />

        <nav className="flex items-stretch gap-8 self-stretch">
          {NAV.map((item) => {
            const isActive = item.key === active;
            return (
              <a
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center border-b-2 pb-2 text-[15px] no-underline transition-colors",
                  isActive
                    ? "border-[#ec3013] text-white"
                    : "border-transparent text-gray-300 hover:text-white",
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {displaySearchForm && (
          <form
            role="search"
            action="/search"
            method="get"
            className="relative ml-auto w-full max-w-md"
          >
            <label htmlFor="site-search" className="sr-only">
              Search
            </label>
            <svg
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="site-search"
              type="search"
              name="q"
              autoComplete="off"
              placeholder="Search"
              className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pr-4 pl-11 text-sm text-white placeholder:text-gray-400 focus:border-[#ec3013] focus:outline-none"
            />
          </form>
        )}
      </div>
    </header>
  );
};

export default Header;
