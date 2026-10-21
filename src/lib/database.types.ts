// Hand-generated to match supabase/migrations. Same shape as `supabase gen types typescript`.
// Regenerate with the Supabase CLI if you change the schema.

type Bank = "BAHL" | "HBL" | "ABL";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          salary_currency: "QAR" | "PKR" | "USD";
          number_locale: "en-US" | "en-IN";
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          phone?: string | null;
          salary_currency?: "QAR" | "PKR" | "USD";
          number_locale?: "en-US" | "en-IN";
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          salary_currency?: "QAR" | "PKR" | "USD";
          number_locale?: "en-US" | "en-IN";
          created_at?: string;
        };
        Relationships: [];
      };
      incomes: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          amount: number;
          currency: "QAR" | "PKR" | "USD";
          amount_qar: number;
          rate_qar_pkr: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          month: string;
          amount: number;
          currency?: "QAR" | "PKR" | "USD";
          amount_qar: number;
          rate_qar_pkr: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          month?: string;
          amount?: number;
          currency?: "QAR" | "PKR" | "USD";
          amount_qar?: number;
          rate_qar_pkr?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      exchange_rates: {
        Row: {
          id: string;
          base: string;
          quote: string;
          rate: number;
          fetched_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          base: string;
          quote: string;
          rate: number;
          fetched_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          base?: string;
          quote?: string;
          rate?: number;
          fetched_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          period: "daily" | "weekly" | "monthly";
          date_from: string;
          date_to: string | null;
          category: string;
          amount_qar: number;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          period: "daily" | "weekly" | "monthly";
          date_from: string;
          date_to?: string | null;
          category: string;
          amount_qar: number;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          period?: "daily" | "weekly" | "monthly";
          date_from?: string;
          date_to?: string | null;
          category?: string;
          amount_qar?: number;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sends: {
        Row: {
          id: string;
          user_id: string;
          sent_date: string;
          amount_qar: number;
          charity_qar: number;
          debt_qar: number;
          installments_qar: number;
          others_qar: number;
          bank: Bank;
          rate_qar_pkr: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          sent_date: string;
          amount_qar: number;
          charity_qar?: number;
          debt_qar?: number;
          installments_qar?: number;
          others_qar?: number;
          bank: Bank;
          rate_qar_pkr: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sent_date?: string;
          amount_qar?: number;
          charity_qar?: number;
          debt_qar?: number;
          installments_qar?: number;
          others_qar?: number;
          bank?: Bank;
          rate_qar_pkr?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      family_transfers: {
        Row: {
          id: string;
          user_id: string;
          send_id: string | null;
          relation: "Father" | "Mother" | "My Family" | "Brother";
          amount_pkr: number;
          transfer_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          send_id?: string | null;
          relation: "Father" | "Mother" | "My Family" | "Brother";
          amount_pkr: number;
          transfer_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          send_id?: string | null;
          relation?: "Father" | "Mother" | "My Family" | "Brother";
          amount_pkr?: number;
          transfer_date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      charity_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          name: string;
          amount_pkr: number;
          relationship: "Relative" | "Neighbour" | "Other";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          entry_date: string;
          name: string;
          amount_pkr: number;
          relationship: "Relative" | "Neighbour" | "Other";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entry_date?: string;
          name?: string;
          amount_pkr?: number;
          relationship?: "Relative" | "Neighbour" | "Other";
          created_at?: string;
        };
        Relationships: [];
      };
      debt_people: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      debts: {
        Row: {
          id: string;
          user_id: string;
          person_id: string;
          kind: "taken" | "given";
          amount_pkr: number;
          debt_date: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          person_id: string;
          kind: "taken" | "given";
          amount_pkr: number;
          debt_date: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          person_id?: string;
          kind?: "taken" | "given";
          amount_pkr?: number;
          debt_date?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      debt_payments: {
        Row: {
          id: string;
          user_id: string;
          person_id: string;
          kind: "taken" | "given";
          amount_pkr: number;
          paid_on: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          person_id: string;
          kind: "taken" | "given";
          amount_pkr: number;
          paid_on: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          person_id?: string;
          kind?: "taken" | "given";
          amount_pkr?: number;
          paid_on?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      installments: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          title: string;
          amount_pkr: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          entry_date: string;
          title: string;
          amount_pkr: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entry_date?: string;
          title?: string;
          amount_pkr?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      other_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          batch_id: string;
          label: string;
          amount_pkr: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          entry_date: string;
          batch_id: string;
          label: string;
          amount_pkr: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          entry_date?: string;
          batch_id?: string;
          label?: string;
          amount_pkr?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      savings: {
        Row: {
          id: string;
          user_id: string;
          kind: "personal" | "family";
          saved_date: string;
          amount_qar: number;
          bank: Bank;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          kind: "personal" | "family";
          saved_date: string;
          amount_qar: number;
          bank: Bank;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: "personal" | "family";
          saved_date?: string;
          amount_qar?: number;
          bank?: Bank;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      monthly_totals: {
        Row: {
          user_id: string;
          month: string;
          expenses_qar: number;
          sent_qar: number;
          personal_savings_qar: number;
          family_savings_qar: number;
        };
        Relationships: [];
      };
      pool_totals: {
        Row: {
          user_id: string;
          pool: "charity" | "debt" | "installments" | "others";
          allocated_qar: number;
          allocated_pkr: number;
          used_pkr: number;
          remaining_pkr: number;
        };
        Relationships: [];
      };
      family_portion: {
        Row: {
          user_id: string;
          portion_pkr: number;
          allocated_pkr: number;
        };
        Relationships: [];
      };
      debt_balances: {
        Row: {
          person_id: string;
          user_id: string;
          name: string;
          kind: "taken" | "given";
          total_pkr: number;
          paid_pkr: number;
          remaining_pkr: number;
          entries: number;
          first_date: string;
          last_activity: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      record_exchange_rate: {
        Args: { p_base: string; p_quote: string; p_rate: number };
        Returns: undefined;
      };
      delete_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

/** Row type of a table, e.g. `Tables<"sends">`. */
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
