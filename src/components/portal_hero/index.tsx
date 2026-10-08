import { FormattedText, Image } from "drupal-canvas";

const PortalHero = ({ preHeading, heading, text, image, buttons }) => {
  const { src, alt, width, height } = image ?? {};
  const hasImage = !!src;

  return (
    <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 border-y border-gray-200 md:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-16 md:px-10">
        {preHeading && (
          <p className="mb-4 text-xs font-bold tracking-[0.15em] text-primary-600 uppercase">
            {preHeading}
          </p>
        )}
        {heading && (
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight text-black md:text-6xl">
            {heading}
          </h1>
        )}
        {text && (
          <FormattedText className="mt-6 max-w-md text-base leading-7 text-gray-600">
            {text}
          </FormattedText>
        )}
        {buttons && <div className="mt-8 flex flex-wrap gap-3">{buttons}</div>}
      </div>
      <div className="flex min-h-[280px] items-center justify-center bg-gray-100 md:border-l md:border-gray-200">
        {hasImage ? (
          <Image
            {...{ src, alt, width, height }}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm text-gray-400">Hero image</span>
        )}
      </div>
    </div>
  );
};

export default PortalHero;
