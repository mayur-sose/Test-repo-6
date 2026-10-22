import Button from "@/components/button";
import { Image } from "drupal-canvas";

const CategoryCard = ({
  image,
  eyebrow,
  name,
  count,
  link = "#",
  linkLabel = "View assets",
}) => {
  const { src, alt, width, height } = image ?? {};
  const hasImage = !!src;

  return (
    <div className="flex h-full flex-col border-t border-gray-200 pt-0">
      <div className="flex min-h-[150px] items-center justify-center bg-gray-100 p-6">
        {hasImage ? (
          <Image
            {...{ src, alt, width, height }}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-center text-sm text-gray-400">{name}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-4">
        {eyebrow && (
          <p className="text-[11px] font-bold tracking-[0.12em] text-primary-600 uppercase">
            {eyebrow}
          </p>
        )}
        {name && <h3 className="text-xl font-bold text-black">{name}</h3>}
        {count && <p className="text-sm text-gray-500">{count}</p>}
        {link && (
          <Button link={link} variant="link" className="mt-2 font-semibold">
            {linkLabel} →
          </Button>
        )}
      </div>
    </div>
  );
};

export default CategoryCard;
