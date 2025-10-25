import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

const investmentSchema = z
  .object({
    id: z.any(),
    name: z.string().trim().min(1).max(100),
    type: z.string().trim().min(1).max(50),
    current_value: z.coerce.number().min(0).max(1_000_000_000),
    quantity: z.coerce.number().min(0).max(1_000_000),
    user_id: z.string().uuid().optional(),
    purchase_price: z.coerce.number().min(0).max(1_000_000_000).optional(),
    purchase_date: z.string().optional().nullable(),
  })
  .passthrough();
const investmentsSchema = z.array(investmentSchema);

const createInvestmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.string().trim().min(1, "Type is required").max(50),
  current_value: z.coerce.number().min(0).max(1_000_000_000),
  quantity: z.coerce.number().min(0).max(1_000_000),
  purchase_price: z.coerce.number().min(0).max(1_000_000_000),
  purchase_date: z.string().min(1, "Purchase date is required"),
});

export default function Investments() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(createInvestmentSchema),
    defaultValues: {
      name: "",
      type: "",
      current_value: 0,
      quantity: 1,
      purchase_price: 0,
      purchase_date: "",
    },
  });

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

    const parsed = investmentsSchema.safeParse(data ?? []);
    if (parsed.success) {
      setInvestments(parsed.data);
    } else {
      setInvestments([]);
    }
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

  const onSubmit = async (values: z.infer<typeof createInvestmentSchema>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("investments").insert({
      user_id: user.id,
      name: values.name,
      type: values.type,
      current_value: values.current_value,
      quantity: values.quantity,
      purchase_price: values.purchase_price,
      purchase_date: values.purchase_date,
      amount: values.purchase_price * values.quantity,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Investment created successfully" });
      setOpen(false);
      form.reset();
      fetchInvestments();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Investments
        </h1>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Investment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Investment</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Apple Stock" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Stocks, Bonds, Mutual Funds" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchase_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Price (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="current_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Value (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="purchase_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">Add Investment</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button onClick={getRecommendations} variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Get AI Recommendations
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {investments.map((inv) => (
          <Card key={inv.id}>
            <CardHeader><CardTitle>{inv.name}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm"><span className="font-semibold">Type:</span> {inv.type}</p>
                <p className="text-sm"><span className="font-semibold">Current Value:</span> ₹{Number(inv.current_value).toFixed(2)}</p>
                <p className="text-sm"><span className="font-semibold">Quantity:</span> {inv.quantity}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}