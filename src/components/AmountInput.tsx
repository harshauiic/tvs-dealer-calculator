interface Props {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, 2)}`;
}

export default function AmountInput({
  value,
  onChange,
  disabled,
  placeholder,
}: Props) {
  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      placeholder={placeholder}
      value={value === 0 ? "" : String(value)}
      onChange={(e) => {
        const next = sanitizeAmount(e.target.value);
        onChange(next === "" || next === "." ? 0 : Number(next));
      }}
    />
  );
}
