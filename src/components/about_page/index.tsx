// Editorial "About the portal" page, matching the Traverse design.
// One consistent max-width container so every section left-aligns; uses the
// site theme (Inter via the default sans, primary-* red-orange, slate/gray).
// The orange "Need something you can't find?" CTA is a separate cta_banner
// element placed after this component on the page.

const STATS = [
  { value: "248", label: "Approved assets" },
  { value: "6", label: "Product lines" },
  { value: "3", label: "Live collections" },
];

const FEATURES = [
  {
    title: "Campaign kits",
    body: "Hero photography, banners, retail POS and social crops, grouped by launch and locked to the drop date.",
  },
  {
    title: "Product library",
    body: "Frames, wheelsets, drivetrains and cockpit details on white, shot to a fixed spec across all six lines.",
  },
  {
    title: "Identity",
    body: "Primary logos, monograms and clear-space guides in every format, plus the type and colour reference.",
  },
];

const CHECKLIST = [
  {
    tone: "ok",
    text: "Check the version stamp. Assets superseded by a newer shoot are moved out of the collection, not renamed.",
  },
  {
    tone: "ok",
    text: "Rider and location releases cover paid and organic use in all markets. Anything outside that carries a usage note.",
  },
  {
    tone: "warn",
    text: "Unreleased product is embargoed until its launch date. The portal will not stop you downloading it.",
  },
  {
    tone: "warn",
    text: "Do not recolour, crop past the marked safe area, or place the wordmark on photography without clear space.",
  },
];

const CONTACTS = [
  { name: "Nadia Ferreira", role: "Brand director", email: "nadia@traversecycles.com" },
  { name: "Owen Marsh", role: "Photography and retouch", email: "owen@traversecycles.com" },
  { name: "Priya Raman", role: "Rights and clearance", email: "priya@traversecycles.com" },
];

const SidebarLabel = ({ children }) => (
  <div className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
    {children}
  </div>
);

const CheckIcon = () => (
  <svg
    className="mt-0.5 size-5 shrink-0 text-green-600"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const WarnIcon = () => (
  <svg
    className="mt-0.5 size-5 shrink-0 text-amber-500"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const AboutPage = ({
  eyebrow = "About the portal",
  heading = "One source for every Traverse Cycles asset.",
  intro = "This portal is where the brand team publishes approved photography, component detail, identity files and campaign kits. Everything here is rights-cleared, version-locked and safe to ship without a second review.",
}) => {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 md:px-10">
      {/* Hero — text left, stats card right */}
      <section className="grid grid-cols-1 items-start gap-10 py-16 md:grid-cols-[1.6fr_1fr] md:gap-16">
        <div>
          {eyebrow && (
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
              {eyebrow}
            </div>
          )}
          <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-black md:text-5xl">
            {heading}
          </h1>
          {intro && (
            <p className="mt-6 max-w-md text-base leading-7 text-gray-600">
              {intro}
            </p>
          )}
        </div>

        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-6 py-5">
              <div className="text-3xl font-extrabold leading-none text-black">
                {stat.value}
              </div>
              <div className="mt-1.5 text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* What you'll find */}
      <section className="grid grid-cols-1 gap-8 py-16 md:grid-cols-[200px_1fr] md:gap-12">
        <SidebarLabel>What you'll find</SidebarLabel>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title}>
              <h3 className="text-base font-bold text-black">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Before you publish — gray panel */}
      <section className="rounded-lg bg-gray-50 p-8 md:p-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr] md:gap-12">
          <SidebarLabel>Before you publish</SidebarLabel>
          <ul className="divide-y divide-gray-200">
            {CHECKLIST.map((item, index) => (
              <li key={index} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                {item.tone === "ok" ? <CheckIcon /> : <WarnIcon />}
                <span className="text-sm leading-6 text-gray-600">
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Who to ask */}
      <section className="grid grid-cols-1 gap-8 py-16 md:grid-cols-[200px_1fr] md:gap-12">
        <SidebarLabel>Who to ask</SidebarLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CONTACTS.map((contact) => (
            <div
              key={contact.email}
              className="rounded-lg border border-gray-200 p-5"
            >
              <div className="text-[15px] font-bold text-black">
                {contact.name}
              </div>
              <div className="mt-0.5 text-sm text-gray-500">{contact.role}</div>
              <a
                href={`mailto:${contact.email}`}
                className="mt-3 inline-block text-sm text-primary-600 hover:underline"
              >
                {contact.email}
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
