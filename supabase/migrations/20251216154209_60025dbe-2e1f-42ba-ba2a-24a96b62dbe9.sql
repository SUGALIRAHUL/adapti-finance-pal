-- Create chat_conversations table for AI tutor history
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table for storing individual messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create income table for tracking income
CREATE TABLE public.income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('one-time', 'weekly', 'bi-weekly', 'monthly', 'yearly')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create budget_alerts table for threshold warnings
CREATE TABLE public.budget_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE CASCADE,
  threshold_percentage INTEGER NOT NULL DEFAULT 80,
  email_sent BOOLEAN DEFAULT false,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_conversations
CREATE POLICY "Users can manage own conversations" ON public.chat_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS policies for chat_messages (via conversation ownership)
CREATE POLICY "Users can manage messages in own conversations" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations 
      WHERE id = chat_messages.conversation_id 
      AND user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations 
      WHERE id = chat_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

-- RLS policies for income
CREATE POLICY "Users can manage own income" ON public.income
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS policies for budget_alerts
CREATE POLICY "Users can manage own budget alerts" ON public.budget_alerts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_income_updated_at
  BEFORE UPDATE ON public.income
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();