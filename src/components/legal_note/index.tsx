import { FormattedText } from "drupal-canvas";

const LegalNote = ({ eyebrow, title, body, contactLabel, contactEmail }) => {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-6 md:px-10">
      <div className="max-w-4xl">
        {eyebrow && (
          <p className="mb-5 text-sm font-bold tracking-[0.2em] text-primary-dark uppercase">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-black md:text-5xl">
            {title}
          </h2>
        )}
        <div className="mt-6 h-[3px] w-16 bg-primary-dark" />
        {body && (
          <FormattedText className="mt-8 space-y-6 text-base/8 [&_p]:!text-gray-600">
            {body}
          </FormattedText>
        )}
        {(contactLabel || contactEmail) && (
          <div className="mt-12 border-t border-gray-200 pt-6">
            {contactLabel && (
              <p className="text-sm text-gray-400">{contactLabel}</p>
            )}
            {contactEmail && (
              <a
                href={`mailto:${contactEmail}`}
                className="text-sm text-primary-dark hover:underline"
              >
                {contactEmail}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalNote;
