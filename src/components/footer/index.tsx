// Self-contained dark footer bar per the Traverse portal design. Keeps the
// existing `text` prop (used for the "Built with…" attribution) so the region
// needs no change. The orange "Need something you can't find?" band above the
// footer is the page's cta_banner component, not part of this footer.
const FOOTER_LINKS = [
  { label: "Browse assets", href: "/asset-library" },
  { label: "Collections", href: "/portal-home#featured-collections" },
  { label: "Rights & usage", href: "/about-us" },
  { label: "About us", href: "/about-us" },
];

const iconProps = {
  className: "size-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

const Footer = ({ text = "Built with Acquia Source" }) => {
  return (
    <footer className="w-full bg-[#0d1117] px-8 py-6">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-12 gap-y-4">
        <a
          href="/portal-home"
          className="flex flex-col leading-none no-underline"
          aria-label="Traverse Cycles"
        >
          <span className="text-lg font-extrabold tracking-wide text-white">
            TRAVERSE
          </span>
          <span className="text-[9px] font-semibold tracking-[0.28em] text-[#ec3013]">
            CYCLES
          </span>
        </a>

        <nav className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-gray-300 no-underline hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-gray-500">{text}</span>
          <div className="flex items-center gap-3 text-gray-400">
            <a href="#" aria-label="Website" className="hover:text-white">
              <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </a>
            <a href="#" aria-label="Instagram" className="hover:text-white">
              <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a href="#" aria-label="Email" className="hover:text-white">
              <svg {...iconProps} xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="4" />
                <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
