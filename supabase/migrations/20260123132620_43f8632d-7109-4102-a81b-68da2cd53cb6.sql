-- Add missing DELETE policy for user_goals table
CREATE POLICY "Users can delete their own goals"
ON public.user_goals FOR DELETE
USING (auth.uid() = user_id);