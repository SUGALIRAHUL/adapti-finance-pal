import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const countries = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria",
  "Bangladesh", "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia",
  "Czech Republic", "Denmark", "Egypt", "Finland", "France", "Germany", "Greece",
  "Hong Kong", "Hungary", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Japan", "Kenya", "Malaysia", "Mexico", "Morocco", "Netherlands",
  "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines", "Poland",
  "Portugal", "Romania", "Russia", "Saudi Arabia", "Singapore", "South Africa",
  "South Korea", "Spain", "Sri Lanka", "Sweden", "Switzerland", "Taiwan", "Thailand",
  "Turkey", "UAE", "Ukraine", "United Kingdom", "United States", "Vietnam"
];

interface CountrySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function CountrySelector({ value, onValueChange, disabled }: CountrySelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select country" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] bg-background border">
        {countries.map((country) => (
          <SelectItem key={country} value={country}>
            {country}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
