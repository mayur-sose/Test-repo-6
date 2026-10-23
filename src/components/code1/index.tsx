// See https://project.pages.drupalcode.org/canvas/ for documentation on how to build a code component

const Component = ({
  text = "Code1",
}) => {
  return (
    <div className="text-3xl">
      {text}
    </div>
  );
};

export default Component;
