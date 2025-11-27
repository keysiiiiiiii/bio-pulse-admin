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

  // Download PDF for a single staff member
  downloadPDF: async (staff_id: string, year: number, month: number): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/dtr/download-pdf?staff_id=${staff_id}&year=${year}&month=${month}`
    );
    
    if (!response.ok) throw new Error('Failed to download PDF');
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DTR-${staff_id}-${year}-${month}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Download PDF for multiple staff members
  downloadPDFBatch: async (
    staff_ids: string[], 
    year: number, 
    month: number
  ): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const staff_id of staff_ids) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/dtr/download-pdf?staff_id=${staff_id}&year=${year}&month=${month}`
        );
        
        if (!response.ok) {
          throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DTR-${staff_id}-${year}-${month}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        success++;
        
        // Delay between downloads
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`Failed to download PDF for ${staff_id}:`, error);
        failed++;
      }
    }

    return { success, failed };
  },

  // Keep for staff/faculty Excel downloads
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
};