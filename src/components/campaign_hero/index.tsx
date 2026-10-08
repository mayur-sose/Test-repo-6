import { FormattedText, Image } from "drupal-canvas";

// Campaign hero for the Photo Library page: LIVE CAMPAIGN pill + eyebrow,
// large heading, intro copy, a campaign-photo slot on the right (dashed
// placeholder when empty), and a gray stats strip. Site theme throughout
// (Inter, primary-600 accent, slate/gray, thin borders). The existing
// "Photo Library" section header + DAM gallery render below, unchanged.

const ImagePlaceholderIcon = () => (
  <svg
    className="mx-auto size-8 text-gray-400"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="size-5 shrink-0 text-green-600"
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

const StatCell = ({ label, value, className = "" }) => (
  <div className={className}>
    <div className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
      {label}
    </div>
    <div className="mt-1.5 text-lg font-bold text-black">{value}</div>
  </div>
);

const CampaignHero = ({
  campaignTag = "Live campaign",
  eyebrow = "FY26 Q3 · Apex 9 launch",
  heading = "Ride the ridge line.",
  text = "Every approved photograph, banner and retail asset for the Apex 9 launch, cleared for paid and organic use in all markets through March 2027.",
  image,
  assetsLive = "47 files",
  lastUpdated = "25 Aug 2026",
  usageWindow = "To Mar 2027",
  clearance = "All markets",
}) => {
  const { src, alt, width, height } = image ?? {};
  const hasImage = !!src;

  return (
    <div className="mx-auto w-full max-w-[1600px] border-b border-gray-200">
      {/* Top — text left, campaign image right */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-16 md:px-10">
          <div className="flex flex-wrap items-center gap-3">
            {campaignTag && (
              <span className="inline-flex items-center rounded bg-primary-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                {campaignTag}
              </span>
            )}
            {eyebrow && (
              <span className="text-sm font-bold uppercase tracking-[0.12em] text-gray-500">
                {eyebrow}
              </span>
            )}
          </div>

          {heading && (
            <h1 className="mt-5 text-5xl font-extrabold leading-[1.02] tracking-tight text-black md:text-6xl">
              {heading}
            </h1>
          )}

          {text && (
            <FormattedText className="mt-6 max-w-lg text-base leading-7 text-gray-600">
              {text}
            </FormattedText>
          )}
        </div>

        <div className="md:border-l md:border-gray-200">
          {hasImage ? (
            <div className="h-full w-full overflow-hidden">
              <Image
                {...{ src, alt, width, height }}
                className="h-full min-h-[300px] w-full object-cover md:min-h-[420px]"
              />
            </div>
          ) : (
            <div className="p-6 md:p-8">
              <div className="flex h-full min-h-[260px] items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <div>
                  <ImagePlaceholderIcon />
                  <p className="mt-3 text-sm text-gray-500">
                    Campaign photo — portrait or square crop works here
                  </p>
                  <p className="mt-1 text-sm">
                    <a href="#" className="text-gray-600 underline">
                      or browse files
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-gray-50 px-6 py-6 md:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-3">
          <StatCell label="Assets live" value={assetsLive} className="pb-4 sm:pr-6 sm:pb-0" />
          <StatCell
            label="Last updated"
            value={lastUpdated}
            className="border-gray-200 py-4 sm:border-l sm:px-6 sm:py-0"
          />
          <StatCell
            label="Usage window"
            value={usageWindow}
            className="border-gray-200 pt-4 sm:border-l sm:px-6 sm:pt-0"
          />
        </div>
        <div className="mt-6 border-t border-gray-200 pt-5">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-gray-400">
            Clearance
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-lg font-bold text-black">
            <CheckIcon />
            {clearance}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignHero;
