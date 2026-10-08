import Button from "@/components/button";
import { FormattedText } from "drupal-canvas";

const CollectionCard = ({
  eyebrow,
  title,
  text,
  meta,
  link = "#",
  linkLabel = "Open collection",
}) => {
  return (
    <div className="flex h-full flex-col gap-3 border border-gray-200 bg-white p-6">
      {eyebrow && (
        <p className="text-[11px] font-bold tracking-[0.12em] text-primary-600 uppercase">
          {eyebrow}
        </p>
      )}
      {title && <h3 className="text-lg font-bold text-black">{title}</h3>}
      {text && (
        <FormattedText className="text-sm leading-6 text-gray-600">
          {text}
        </FormattedText>
      )}
      {meta && <p className="mt-1 text-xs text-gray-400">{meta}</p>}
      {link && (
        <div className="mt-auto pt-4">
          <Button
            link={link}
            variant="outline_dark"
            className="w-full justify-center"
          >
            {linkLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CollectionCard;
