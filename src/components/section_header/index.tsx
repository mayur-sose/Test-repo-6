const SectionHeader = ({ title, meta }) => {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 md:px-10">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-gray-300 pb-3">
        {title && (
          <h2 className="text-3xl font-extrabold tracking-tight text-black">
            {title}
          </h2>
        )}
        {meta && <span className="text-sm text-gray-500">{meta}</span>}
      </div>
    </div>
  );
};

export default SectionHeader;
