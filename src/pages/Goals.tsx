import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialProgress } from "@/components/RadialProgress";

const goalSchema = z
  .object({
    id: z.any(),
    name: z.string().trim().min(1).max(100),
    target_amount: z.coerce.number().min(0).max(1_000_000_000),
    current_amount: z.coerce.number().min(0).max(1_000_000_000),
    user_id: z.string().uuid().optional(),
    deadline: z.string().optional().nullable(),
  })
  .passthrough();

const goalsSchema = z.array(goalSchema);

export default function Goals() {
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id);

    const parsed = goalsSchema.safeParse(data ?? []);
    if (parsed.success) {
      setGoals(parsed.data);
    } else {
      setGoals([]);
    }
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Savings Goals
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const current = Number(goal.current_amount) || 0;
          const target = Number(goal.target_amount) || 0;
          const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
          return (
            <Card key={goal.id}>
              <CardHeader><CardTitle>{goal.name}</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <RadialProgress value={progress} size={120} />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    ₹{Number(goal.current_amount).toFixed(2)} / ₹{Number(goal.target_amount).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}