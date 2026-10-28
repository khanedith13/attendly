import PageHeader from "./PageHeader";

export default function PlaceholderPage({ title, figma }) {
  return (
    <PageHeader
      eyebrow={`Figma screen ${figma}`}
      title={title}
      subtitle="This screen will be built in a later step."
    />
  );
}