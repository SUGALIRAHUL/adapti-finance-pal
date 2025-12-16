import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const citiesByCountry: Record<string, string[]> = {
  "India": ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Chandigarh", "Guwahati", "Solapur", "Hubli", "Tiruchirappalli", "Bareilly", "Moradabad", "Mysore"],
  "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte", "San Francisco", "Indianapolis", "Seattle", "Denver", "Washington", "Boston", "El Paso", "Nashville", "Detroit", "Oklahoma City", "Portland", "Las Vegas", "Memphis", "Louisville", "Baltimore", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Mesa", "Sacramento", "Atlanta", "Kansas City", "Colorado Springs", "Miami", "Raleigh", "Omaha", "Long Beach", "Virginia Beach", "Oakland", "Minneapolis", "Tulsa", "Tampa", "Arlington"],
  "United Kingdom": ["London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds", "Sheffield", "Edinburgh", "Bristol", "Leicester", "Coventry", "Bradford", "Cardiff", "Belfast", "Nottingham", "Newcastle", "Plymouth", "Southampton", "Reading", "Derby"],
  "Canada": ["Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", "Quebec City", "Hamilton", "Kitchener"],
  "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Newcastle", "Canberra", "Hobart", "Darwin"],
  "Germany": ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Leipzig", "Dortmund", "Essen"],
  "France": ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"],
  "Japan": ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Sapporo", "Kobe", "Kyoto", "Fukuoka", "Kawasaki", "Hiroshima"],
  "China": ["Shanghai", "Beijing", "Guangzhou", "Shenzhen", "Tianjin", "Wuhan", "Chengdu", "Hangzhou", "Nanjing", "Xi'an"],
  "Brazil": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre"],
};

interface CitySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  country: string;
  disabled?: boolean;
}

export function CitySelector({ value, onValueChange, country, disabled }: CitySelectorProps) {
  const [customCity, setCustomCity] = useState("");
  const cities = citiesByCountry[country] || [];
  const showCustomInput = cities.length === 0;

  if (showCustomInput) {
    return (
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Enter city name"
        disabled={disabled}
      />
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select city" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] bg-background border">
        {cities.map((city) => (
          <SelectItem key={city} value={city}>
            {city}
          </SelectItem>
        ))}
        <SelectItem value="other">Other (type below)</SelectItem>
      </SelectContent>
    </Select>
  );
}
