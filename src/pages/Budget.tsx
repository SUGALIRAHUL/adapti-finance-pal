import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

type Budget = {
  id: string;
  category: string;
  amount: number;
  period: string;
  start_date: string;
};

const budgetSchema = z.object({
  category: z.string()
    .trim()
    .min(1, 'Category required')
    .max(50, 'Category too long')
    .regex(/^[a-zA-Z0-9\s&\-]+$/, 'Invalid characters in category'),
  amount: z.number()
    .min(0.01, 'Amount must be positive')
    .max(10000000, 'Amount too large'),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  start_date: z.string()
});

export default function Budget() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    period: "monthly",
    start_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch budgets",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = budgetSchema.safeParse({
      category: formData.category,
      amount: parseFloat(formData.amount),
      period: formData.period,
      start_date: formData.start_date
    });
    
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validation.error.errors[0].message,
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("budgets").insert({
        user_id: user.id,
        category: validation.data.category,
        amount: validation.data.amount,
        period: validation.data.period,
        start_date: validation.data.start_date,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Budget added successfully",
      });

      setDialogOpen(false);
      setFormData({
        category: "",
        amount: "",
        period: "monthly",
        start_date: new Date().toISOString().split("T")[0],
      });
      fetchBudgets();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add budget",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Budget deleted",
      });
      fetchBudgets();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete budget",
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Budget Planner
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Budget</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Groceries, Rent, Entertainment"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value) => setFormData({ ...formData, period: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Add Budget
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => (
          <Card key={budget.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">{budget.category}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(budget.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${Number(budget.amount).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground capitalize">
                {budget.period}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Start: {new Date(budget.start_date).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && budgets.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              No budgets yet. Click "Add Budget" to get started!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}