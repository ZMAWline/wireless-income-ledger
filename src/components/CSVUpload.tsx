
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface CSVRow {
  ServiceNumber: string;
  CustomerName: string;
  PartnerComp: string;
  ActivityType: 'ACT' | 'RESIDUAL' | 'DEACT';
  ProdCatDescription: string;
  TRN_DATE: string;
}

const CSVUpload = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const queryClient = useQueryClient();

  const parseCSV = (csvText: string): CSVRow[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      return row as CSVRow;
    });
  };

  const cleanCurrency = (value: string): number => {
    return parseFloat(value.replace(/[$,]/g, '')) || 0;
  };

  const processCSVData = async (data: CSVRow[]) => {
    const processedCount = { created: 0, updated: 0, transactions: 0 };

    for (const row of data) {
      try {
        // Check if line exists
        let { data: existingLine } = await supabase
          .from('lines')
          .select('id')
          .eq('mdn', row.ServiceNumber)
          .single();

        let lineId: string;

        if (!existingLine) {
          // Create new line
          const { data: newLine, error: lineError } = await supabase
            .from('lines')
            .insert({
              mdn: row.ServiceNumber,
              customer_name: row.CustomerName || 'Unknown',
              plan: row.ProdCatDescription,
              status: 'ACTIVE',
              activation_date: new Date(row.TRN_DATE).toISOString().split('T')[0],
            })
            .select('id')
            .single();

          if (lineError) {
            console.error('Error creating line:', lineError);
            continue;
          }

          lineId = newLine.id;
          processedCount.created++;
        } else {
          lineId = existingLine.id;
          processedCount.updated++;
        }

        // Add transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            line_id: lineId,
            transaction_date: new Date(row.TRN_DATE).toISOString().split('T')[0],
            activity_type: row.ActivityType,
            product_category: row.ProdCatDescription,
            amount: cleanCurrency(row.PartnerComp),
            description: `${row.ActivityType} - ${row.ProdCatDescription}`,
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

      const result = await processCSVData(data);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['lines'] });

      setUploadStatus('success');
      toast({
        title: 'Upload successful!',
        description: `Processed ${result.transactions} transactions for ${result.created} new and ${result.updated} existing lines.`,
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
              Expected columns: ServiceNumber, CustomerName, PartnerComp, ActivityType, ProdCatDescription, TRN_DATE
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
