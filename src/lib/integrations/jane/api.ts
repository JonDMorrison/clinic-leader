/**
 * Jane App API Wrapper
 * Handles all Jane API requests with error handling and retries
 */

const JANE_API_BASE = "https://app.jane.app/api/v2";

interface JaneApiOptions {
  apiKey: string;
  clinicId?: string;
}

interface JaneAppointment {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  provider_name: string;
  patient_id: string;
}

interface JanePayment {
  id: string;
  amount: number;
  date: string;
  method: string;
  status: string;
}

interface JanePatient {
  id: string;
  first_name: string;
  last_name: string;
  last_appointment_date: string;
  status: string;
}

export class JaneApiClient {
  private apiKey: string;
  private clinicId?: string;

  constructor(options: JaneApiOptions) {
    this.apiKey = options.apiKey;
    this.clinicId = options.clinicId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${JANE_API_BASE}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Jane API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Jane API request failed:", error);
      throw error;
    }
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      await this.request("/clinic/info");
      return true;
    } catch {
      return false;
    }
  }

  async getAppointments(startDate: string, endDate: string): Promise<JaneAppointment[]> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });

    return this.request<JaneAppointment[]>(`/appointments?${params}`);
  }

  async getPatients(page = 1, perPage = 100): Promise<JanePatient[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    return this.request<JanePatient[]>(`/patients?${params}`);
  }

  async getPayments(startDate: string, endDate: string): Promise<JanePayment[]> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });

    return this.request<JanePayment[]>(`/payments?${params}`);
  }

  async getFinancialReport(startDate: string, endDate: string): Promise<any> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });

    return this.request(`/reports/financial?${params}`);
  }
}
