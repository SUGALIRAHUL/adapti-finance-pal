import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialProgress } from "@/components/RadialProgress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const createGoalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  target_amount: z.coerce.number().min(0.01, "Target amount must be greater than 0").max(1_000_000_000),
  current_amount: z.coerce.number().min(0).max(1_000_000_000),
  deadline: z.string().optional(),
});

export default function Goals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      name: "",
      target_amount: 0,
      current_amount: 0,
      deadline: "",
    },
  });

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

  const onSubmit = async (values: z.infer<typeof createGoalSchema>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingId) {
      const { error } = await supabase.from("savings_goals").update({
        name: values.name,
        target_amount: values.target_amount,
        current_amount: values.current_amount,
        deadline: values.deadline || null,
      }).eq("id", editingId);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Goal updated successfully" });
        setOpen(false);
        setEditingId(null);
        form.reset();
        fetchGoals();
      }
    } else {
      const { error } = await supabase.from("savings_goals").insert({
        user_id: user.id,
        name: values.name,
        target_amount: values.target_amount,
        current_amount: values.current_amount,
        deadline: values.deadline || null,
      });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Savings goal created successfully" });
        setOpen(false);
        form.reset();
        fetchGoals();
      }
    }
  };

  const handleEdit = (goal: any) => {
    setEditingId(goal.id);
    form.reset({
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      deadline: goal.deadline || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("savings_goals").delete().eq("id", id);
    
    if (error) {
      toast({ 
        title: "Error", 
        description: "Failed to delete goal", 
        variant: "destructive" 
      });
    } else {
      toast({ title: "Success", description: "Goal deleted successfully" });
      fetchGoals();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Savings Goals
        </h1>
        <Dialog open={open} onOpenChange={(open) => {
          setOpen(open);
          if (!open) {
            setEditingId(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Savings Goal" : "Create Savings Goal"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Emergency Fund" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="target_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="current_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Amount (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">{editingId ? "Update Goal" : "Create Goal"}</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const current = Number(goal.current_amount) || 0;
          const target = Number(goal.target_amount) || 0;
          const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
          return (
            <Card key={goal.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{goal.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(goal)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(goal.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
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