const CtaBanner = ({
  heading,
  text,
  link = "#",
  linkLabel = "Contact brand team",
}) => {
  return (
    <div className="w-full bg-primary-600">
      <div className="mx-auto max-w-[1600px] px-6 py-16 md:px-10">
        {heading && (
          <h2 className="max-w-2xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
            {heading}
          </h2>
        )}
        {text && <p className="mt-4 max-w-xl text-base text-white/90">{text}</p>}
        {link && (
          <div className="mt-8">
            <a
              href={link}
              className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-gray-100"
            >
              {linkLabel}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default CtaBanner;
