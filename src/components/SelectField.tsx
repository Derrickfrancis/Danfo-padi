import type { ChangeEvent, ReactNode } from "react";
import { ChevronDownIcon } from "./Icons";

type SelectFieldProps = {
  id: string;
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode; // the <option> elements
};

// A labelled dropdown with an icon on the left and a chevron on the right.
export function SelectField({ id, label, icon, value, onChange, children }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-muted">
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-[18px] left-4 flex text-primary">{icon}</span>
        <select
          id={id}
          value={value}
          onChange={onChange}
          className="h-14 w-full cursor-pointer appearance-none rounded-field border border-line bg-white pr-11 pl-12 text-base font-semibold"
        >
          {children}
        </select>
        <span className="pointer-events-none absolute top-[19px] right-4 flex text-muted">
          <ChevronDownIcon size={18} />
        </span>
      </div>
    </div>
  );
}
