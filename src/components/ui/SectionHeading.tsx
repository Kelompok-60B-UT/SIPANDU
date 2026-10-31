type Props = {
  label: string;
  title: string;
  description?: string;
  light?: boolean; // true untuk latar biru gelap
};

export default function SectionHeading({
  label,
  title,
  description,
  light = false,
}: Props) {
  return (
    <div className="mb-8">
      <p
        className={`text-[11px] font-semibold uppercase tracking-wide ${
          light ? "text-blue-200" : "text-primary"
        }`}
      >
        {label}
      </p>
      <h2
        className={`mt-2 text-2xl font-bold md:text-3xl ${
          light ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={`mt-2 text-sm ${light ? "text-blue-100" : "text-muted"}`}>
          {description}
        </p>
      )}
    </div>
  );
}
