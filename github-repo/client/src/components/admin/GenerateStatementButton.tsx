import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Loader2 } from 'lucide-react';
import { generateBankStatementPDF } from '@/utils/pdf-generator';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/lib/language-context';

interface GenerateStatementButtonProps {
  userId: number;
  userData: any;
  transactions: any[];
  className?: string;
}

export function GenerateStatementButton({
  userId,
  userData,
  transactions,
  className = ''
}: GenerateStatementButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<string>('en');
  const [statementType, setStatementType] = useState<string>('full');
  const { toast } = useToast();
  const translate = useTranslations();

  const generateStatement = async () => {
    try {
      setLoading(true);
      
      // Filter transactions based on statement type if needed
      let filteredTransactions = [...transactions];
      
      if (statementType === 'deposits') {
        filteredTransactions = transactions.filter(t => 
          t.type.toLowerCase().includes('deposit')
        );
      } else if (statementType === 'crypto') {
        filteredTransactions = transactions.filter(t => 
          t.type.toLowerCase().includes('usdt') || 
          t.type.toLowerCase().includes('usdc')
        );
      }
      
      // Generate the PDF with chosen language
      generateBankStatementPDF(
        filteredTransactions,
        userData,
        translate,
        language
      );
      
      toast({
        title: translate('statement_generated'),
        description: translate('statement_generated_description'),
        variant: 'default',
      });
      
      setOpen(false);
    } catch (error) {
      console.error('Error generating statement:', error);
      toast({
        title: translate('statement_generation_error'),
        description: translate('statement_generation_error_description'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={`gap-2 ${className}`}
        >
          <FileText className="h-4 w-4" />
          {translate('generate_statement')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translate('generate_account_statement')}</DialogTitle>
          <DialogDescription>
            {translate('generate_statement_description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="language">{translate('statement_language')}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue placeholder={translate('select_language')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{translate('language_english')}</SelectItem>
                <SelectItem value="de">{translate('language_german')}</SelectItem>
                <SelectItem value="cs">{translate('language_czech')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label>{translate('statement_type')}</Label>
            <RadioGroup value={statementType} onValueChange={setStatementType}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full">{translate('all_transactions')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="deposits" id="deposits" />
                <Label htmlFor="deposits">{translate('deposits_only')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="crypto" id="crypto" />
                <Label htmlFor="crypto">{translate('crypto_only')}</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {translate('cancel')}
          </Button>
          <Button 
            onClick={generateStatement} 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {translate('generating')}
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                {translate('generate')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}