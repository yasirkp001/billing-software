export type FieldType =
  | "text"
  | "number"
  | "email"
  | "tel"
  | "textarea"
  | "select"
  | "date"
  | "checkbox";

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  optionsEndpoint?: string;
  optionsLabelKey?: string;
  getOptionLabel?: (item: any) => string;
  // Width within the 2-column grid; defaults to 1.
  span?: 1 | 2;
  defaultValue?: string | number | boolean;
  // Live input mask. "vehicleReg" → Indian number-plate format (KL-10-AU-5330).
  format?: "vehicleReg";
}

export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export type Row = Record<string, unknown> & { id: string };
