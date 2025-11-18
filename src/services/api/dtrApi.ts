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

  // GET /dtr/download-excel?staff_id=...&year=2025&month=11
  // Downloads Excel file directly
  downloadExcel: async (staff_id: string, year: number, month: number): Promise<void> => {
    const url = `${API_BASE_URL}/dtr/download-excel?staff_id=${staff_id}&year=${year}&month=${month}`;
    window.open(url, '_blank');
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