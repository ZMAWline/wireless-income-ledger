
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';

interface CSVRow {
  ACCOUNT_NUM: string;
  CUSTOMER: string;
  PROVIDER: string;
  CYCLE: string;
  COMP_PAID: string;
  NOTE: string;
}

const CSVUpload = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const queryClient = useQueryClient();

  const parseCSV = (csvText: string): CSVRow[] => {
    const result = Papa.parse<CSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    // Filter out completely empty rows and ensure required keys exist
    return (result.data || []).filter((r) => r && Object.keys(r).length > 0) as CSVRow[];
  };

  const extractPhoneNumber = (accountNum: string): string => {
    // Extract first 10 digits from ACCOUNT_NUM
    const digits = accountNum.replace(/\D/g, '');
    return digits.substring(0, 10);
  };

  const determineActivityType = (note: string, provider: string): 'ACT' | 'RESIDUAL' | 'DEACT' => {
    const noteLower = note.toLowerCase();
    const providerLower = provider.toLowerCase();

    // Chargebacks/Clawbacks
    if (noteLower.includes('chargeback') || noteLower.includes('clawback')) {
      return 'DEACT';
    }

    // Upfront payments - check for "Component:Upfront" pattern and provider-specific keywords
    if (noteLower.includes('component:upfront') ||
        noteLower.includes('upfront') ||
        (providerLower.includes('verizon') && noteLower.includes('activation'))) {
      return 'ACT';
    }

    // Residuals/SPIFs - check for "Component:Residual" pattern
    if (noteLower.includes('component:residual') ||
        noteLower.includes('spif') ||
        noteLower.includes('residual') ||
        noteLower.includes('account maintenance fee')) {
      return 'RESIDUAL';
    }

    // Default to RESIDUAL for unrecognized patterns (most recurring payments are residuals)
    return 'RESIDUAL';
  };

  const cleanCurrency = (value: string): number => {
    return parseFloat(value.replace(/[$,]/g, '')) || 0;
  };

  const parseCycleDate = (cycle: string): string | null => {
    if (!cycle) return null;
    
    // Try MM/DD/YYYY format
    const mmddyyyyMatch = cycle.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyyMatch) {
      const [, month, day, year] = mmddyyyyMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(cycle)) {
      return cycle;
    }
    
    return null;
  };

  const processCSVData = async (data: CSVRow[]) => {
    const processedCount = { created: 0, updated: 0, transactions: 0, skipped: 0 };

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      throw new Error('You must be signed in to upload data.');
    }

    for (const row of data) {
      try {
        const phoneNumber = extractPhoneNumber(row.ACCOUNT_NUM || '');
        if (!phoneNumber || phoneNumber.length !== 10) {
          console.log('Skipping row with invalid phone number:', row.ACCOUNT_NUM);
          continue;
        }

        // Normalize fields
        const customer = (row.CUSTOMER || '').replace(/,+$/, '').trim();
        const provider = (row.PROVIDER || '').trim();
        const cycle = (row.CYCLE || '').trim();
        const note = (row.NOTE || '').trim();
        const amount = cleanCurrency(row.COMP_PAID || '0');

        // Check if line exists for this user
        // First try exact MDN match
        let { data: existingLines } = await supabase
          .from('lines')
          .select('id, provider, customer')
          .eq('mdn', phoneNumber);

        let lineId: string;
        let existingLine = null;

        // If multiple lines with same MDN, disambiguate using provider+customer
        if (existingLines && existingLines.length > 1) {
          existingLine = existingLines.find(
            (line) =>
              line.provider === provider && line.customer === customer
          ) || existingLines[0]; // Fallback to first if no exact match
        } else if (existingLines && existingLines.length === 1) {
          existingLine = existingLines[0];
        }

        if (!existingLine) {
          // Create new line with correct schema and RLS user_id
          const { data: newLine, error: lineError } = await supabase
            .from('lines')
            .insert({
              user_id: user.id,
              mdn: phoneNumber,
              customer: customer || 'Unknown',
              provider: provider || null,
              status: 'ACTIVE',
            })
            .select('id')
            .single();

          if (lineError || !newLine) {
            console.error('Error creating line:', lineError);
            continue;
          }

          lineId = newLine.id;
          processedCount.created++;
        } else {
          lineId = existingLine.id as string;
          processedCount.updated++;
        }

        // Determine activity type based on NOTE and PROVIDER
        const activityType = determineActivityType(note, provider);

        // Check for duplicate transaction
        const { data: existingTransaction } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('mdn', phoneNumber)
          .eq('cycle', cycle || '')
          .eq('amount', amount)
          .eq('activity_type', activityType)
          .maybeSingle();

        if (existingTransaction) {
          console.log('Skipping duplicate transaction:', { phoneNumber, cycle, amount, activityType });
          processedCount.skipped++;
          continue;
        }

        // Add transaction with correct schema and RLS user_id
        const transactionDate = parseCycleDate(cycle);
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            line_id: lineId,
            mdn: phoneNumber,
            provider: provider || null,
            customer: customer || null,
            cycle: cycle || null,
            note: note || null,
            activity_type: activityType,
            amount: amount,
            transaction_date: transactionDate,
          });

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          continue;
        }

        processedCount.transactions++;
      } catch (error) {
        console.error('Error processing row:', error);
        continue;
      }
    }

    return processedCount;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV file.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadStatus('idle');

    try {
      const csvText = await file.text();
      const data = parseCSV(csvText);

      if (data.length === 0) {
        throw new Error('No data found in CSV file');
      }

      console.log('Parsed CSV data:', data);

      const result = await processCSVData(data);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lines'] });

      setUploadStatus('success');
      toast({
        title: 'Upload successful!',
        description: `Processed ${result.transactions} transactions for ${result.created} new and ${result.updated} existing lines.${result.skipped > 0 ? ` Skipped ${result.skipped} duplicates.` : ''}`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred while processing the file.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [queryClient]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Upload className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'success':
        return 'File uploaded and processed successfully!';
      case 'error':
        return 'Upload failed. Please try again.';
      default:
        return isDragActive ? 'Drop the CSV file here...' : 'Drag & drop a CSV file here, or click to select';
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : uploadStatus === 'success'
            ? 'border-green-400 bg-green-50'
            : uploadStatus === 'error'
            ? 'border-red-400 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            {isProcessing ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            ) : (
              getStatusIcon()
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium">
              {isProcessing ? 'Processing...' : getStatusMessage()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Expected columns: ACCOUNT_NUM, CUSTOMER, PROVIDER, CYCLE, COMP_PAID, NOTE
            </p>
          </div>
          
          {!isProcessing && (
            <Button variant="outline" className="mt-4">
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVUpload;
