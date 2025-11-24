//src/services/api/dtrApi.ts
import { API_BASE_URL } from './config';

export interface DTRRecord {
  date: string;
  time_in: string | null;
  time_out: string | null;
  tardiness: number;
  undertime: number;
  status: string;
}

export const dtrApi = {
  // GET /dtr/records?staff_id=...&year=2025&month=11
  getRecords: async (staff_id: string, year: number, month: number): Promise<DTRRecord[]> => {
    const response = await fetch(
      `${API_BASE_URL}/dtr/records?staff_id=${staff_id}&year=${year}&month=${month}`
    );
    if (!response.ok) throw new Error('Failed to fetch DTR records');
    const data = await response.json();
    return data.records || [];
  },

  // Download Excel for a single staff member
  downloadExcel: async (staff_id: string, year: number, month: number): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/dtr/download-excel?staff_id=${staff_id}&year=${year}&month=${month}`
    );
    
    if (!response.ok) throw new Error('Failed to download Excel');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DTR-${staff_id}-${year}-${month}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Download Excel for multiple staff members
  downloadExcelBatch: async (
    staff_ids: string[], 
    year: number, 
    month: number
  ): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const staff_id of staff_ids) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/dtr/download-excel?staff_id=${staff_id}&year=${year}&month=${month}`
        );
        
        if (!response.ok) {
          throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DTR-${staff_id}-${year}-${month}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        success++;
        
        // Delay between downloads
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`Failed to download Excel for ${staff_id}:`, error);
        failed++;
      }
    }

    return { success, failed };
  },

  // GET /dtr/download?staff_id=...&year=2025&month=11
  // Returns a signed URL to download the PDF
  downloadPDF: async (staff_id: string, year: number, month: number): Promise<string> => {
    const response = await fetch(
      `${API_BASE_URL}/dtr/download?staff_id=${staff_id}&year=${year}&month=${month}`
    );
    if (!response.ok) throw new Error('Failed to generate DTR');
    const data = await response.json();
    return data.url;
  },

  // GET /dtr/generate?staff_id=...&year=2025&month=11
  // Generates and returns PDF URL
  generatePDF: async (staff_id: string, year: number, month: number): Promise<string> => {
    const response = await fetch(
      `${API_BASE_URL}/dtr/generate?staff_id=${staff_id}&year=${year}&month=${month}`
    );
    if (!response.ok) throw new Error('Failed to generate DTR PDF');
    const data = await response.json();
    return data.url;
  },
};