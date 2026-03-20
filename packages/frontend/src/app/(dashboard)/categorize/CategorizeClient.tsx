'use client';

import { useState } from 'react';
import {
  Sparkles,
  Tag,
  DollarSign,
  Calendar,
  Users,
  Loader2,
  ArrowRight,
  Wand2,
} from 'lucide-react';

import { useCategorizeExpenseMutation, useParseExpenseMutation } from '@/store/api/aiApi';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

export default function CategorizeClient() {
  const { toast } = useToast();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [naturalText, setNaturalText] = useState('');

  const [categorize, { data: catResult, isLoading: catLoading }] = useCategorizeExpenseMutation();
  const [parseExpense, { data: parseResult, isLoading: parseLoading }] = useParseExpenseMutation();

  const handleCategorize = async () => {
    if (!description.trim()) {
      toast({
        title: 'Description required',
        description: 'Enter an expense description to categorize.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await categorize({
        description: description.trim(),
        amount: amount ? parseFloat(amount) : undefined,
      }).unwrap();
      toast({ title: 'Categorized', description: 'AI has categorized your expense.' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to categorize. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleParse = async () => {
    if (!naturalText.trim()) {
      toast({
        title: 'Text required',
        description: 'Enter a natural language expense description.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await parseExpense({ text: naturalText.trim() }).unwrap();
      toast({ title: 'Parsed', description: 'AI has parsed your expense.' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to parse. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (confidence >= 0.5) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Smart Categorize</h1>
        <p className="text-muted-foreground mt-1">
          Use AI to automatically categorize expenses or parse natural language into structured
          data.
        </p>
      </div>

      <Tabs defaultValue="categorize" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="categorize" className="gap-2">
            <Tag className="h-4 w-4" />
            Categorize
          </TabsTrigger>
          <TabsTrigger value="parse" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Parse Expense
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categorize" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  Expense Categorization
                </CardTitle>
                <CardDescription>
                  Enter an expense description and optionally an amount. AI will suggest the best
                  category.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cat-description">Description</Label>
                  <Input
                    id="cat-description"
                    placeholder="e.g. Uber ride to airport"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCategorize()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cat-amount">Amount (optional)</Label>
                  <Input
                    id="cat-amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCategorize()}
                  />
                </div>
                <Button onClick={handleCategorize} disabled={catLoading} className="w-full gap-2">
                  {catLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {catLoading ? 'Categorizing...' : 'Categorize'}
                </Button>
              </CardContent>
            </Card>

            <Card className={catResult ? 'border-violet-200' : ''}>
              <CardHeader>
                <CardTitle>Result</CardTitle>
                <CardDescription>AI-suggested category for your expense.</CardDescription>
              </CardHeader>
              <CardContent>
                {catResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                        <Tag className="h-6 w-6 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{catResult.categoryName}</p>
                        <p className="text-muted-foreground text-sm">
                          Category ID: {catResult.categoryId}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Confidence</span>
                      <Badge variant="outline" className={confidenceColor(catResult.confidence)}>
                        {Math.round(catResult.confidence * 100)}%
                      </Badge>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all duration-500"
                        style={{ width: `${catResult.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                      <ArrowRight className="text-muted-foreground h-5 w-5" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Enter a description and click Categorize to see results.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="parse" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-blue-500" />
                  Natural Language Parser
                </CardTitle>
                <CardDescription>
                  Type an expense in plain English. AI will extract the description, amount, date,
                  and participants.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="parse-text">Expense Text</Label>
                  <Input
                    id="parse-text"
                    placeholder='e.g. "Split $45 dinner with Alice and Bob last Friday"'
                    value={naturalText}
                    onChange={(e) => setNaturalText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                  />
                </div>
                <div className="rounded-lg border bg-blue-50/50 p-3">
                  <p className="text-xs font-medium text-blue-700">Try these examples:</p>
                  <ul className="mt-1 space-y-1 text-xs text-blue-600">
                    <li
                      className="cursor-pointer hover:underline"
                      onClick={() =>
                        setNaturalText('Paid $120 for groceries at Whole Foods yesterday')
                      }
                    >
                      &quot;Paid $120 for groceries at Whole Foods yesterday&quot;
                    </li>
                    <li
                      className="cursor-pointer hover:underline"
                      onClick={() => setNaturalText('Split $80 taxi with John and Sarah')}
                    >
                      &quot;Split $80 taxi with John and Sarah&quot;
                    </li>
                    <li
                      className="cursor-pointer hover:underline"
                      onClick={() => setNaturalText('Coffee at Starbucks $5.50 today')}
                    >
                      &quot;Coffee at Starbucks $5.50 today&quot;
                    </li>
                  </ul>
                </div>
                <Button onClick={handleParse} disabled={parseLoading} className="w-full gap-2">
                  {parseLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {parseLoading ? 'Parsing...' : 'Parse Expense'}
                </Button>
              </CardContent>
            </Card>

            <Card className={parseResult ? 'border-blue-200' : ''}>
              <CardHeader>
                <CardTitle>Parsed Result</CardTitle>
                <CardDescription>Structured data extracted from your text.</CardDescription>
              </CardHeader>
              <CardContent>
                {parseResult ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-lg border p-3">
                      <Tag className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                      <div>
                        <p className="text-muted-foreground text-xs font-medium uppercase">
                          Description
                        </p>
                        <p className="font-medium">{parseResult.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-start gap-3 rounded-lg border p-3">
                        <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <div>
                          <p className="text-muted-foreground text-xs font-medium uppercase">
                            Amount
                          </p>
                          <p className="font-medium">
                            {parseResult.currency} {parseResult.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border p-3">
                        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div>
                          <p className="text-muted-foreground text-xs font-medium uppercase">
                            Date
                          </p>
                          <p className="font-medium">{parseResult.date ?? 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                    {parseResult.participants.length > 0 && (
                      <div className="flex items-start gap-3 rounded-lg border p-3">
                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                        <div>
                          <p className="text-muted-foreground text-xs font-medium uppercase">
                            Participants
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {parseResult.participants.map((p) => (
                              <Badge key={p} variant="secondary">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {parseResult.categoryId && (
                      <div className="flex items-start gap-3 rounded-lg border p-3">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
                        <div>
                          <p className="text-muted-foreground text-xs font-medium uppercase">
                            Suggested Category
                          </p>
                          <p className="font-medium">{parseResult.categoryId}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                      <ArrowRight className="text-muted-foreground h-5 w-5" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Type an expense in plain English and click Parse to see results.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
