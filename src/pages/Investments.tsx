import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

export default function Investments() {
  const [investments, setInvestments] = useState<any[]>([]);

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", user.id);

    setInvestments(data || []);
  };

  const getRecommendations = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/investment-recommendations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ riskProfile: "moderate", investmentAmount: 10000 }),
      }
    );

    const data = await response.json();
    // Display recommendations in UI instead of logging
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Investments
        </h1>
        <Button onClick={getRecommendations}>
          <TrendingUp className="mr-2 h-4 w-4" />
          Get AI Recommendations
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {investments.map((inv) => (
          <Card key={inv.id}>
            <CardHeader><CardTitle>{inv.name}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm"><span className="font-semibold">Type:</span> {inv.type}</p>
                <p className="text-sm"><span className="font-semibold">Current Value:</span> ${Number(inv.current_value).toFixed(2)}</p>
                <p className="text-sm"><span className="font-semibold">Quantity:</span> {inv.quantity}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}