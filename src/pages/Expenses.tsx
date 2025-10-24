import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const expenseSchema = z.object({
  category: z.string()
    .trim()
    .min(1, 'Category required')
    .max(50, 'Category too long')
    .regex(/^[a-zA-Z0-9\s&\-]+$/, 'Invalid characters in category'),
  amount: z.number()
    .min(0.01, 'Amount must be positive')
    .max(10000000, 'Amount too large'),
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  date: z.string()
});

export default function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    setExpenses(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const validation = expenseSchema.safeParse({
      category: formData.category,
      amount: parseFloat(formData.amount),
      description: formData.description || undefined,
      date: formData.date
    });
    
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validation.error.errors[0].message,
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      category: validation.data.category,
      amount: validation.data.amount,
      description: validation.data.description,
      date: validation.data.date,
    });

    if (!error) {
      toast({ title: "Expense added" });
      setDialogOpen(false);
      setFormData({ category: "", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      fetchExpenses();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Expenses
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>Category</Label><Input value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required /></div>
              <div><Label>Amount</Label><Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} required /></div>
              <div><Label>Description</Label><Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
              <div><Label>Date</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required /></div>
              <Button type="submit" className="w-full">Add</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {expenses.map((expense) => (
          <Card key={expense.id}>
            <CardContent className="flex justify-between items-center p-4">
              <div>
                <h3 className="font-semibold">{expense.category}</h3>
                <p className="text-sm text-muted-foreground">{expense.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(expense.date).toLocaleDateString()}</p>
              </div>
              <div className="text-xl font-bold text-destructive">₹{Number(expense.amount).toFixed(2)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}