export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          balance: number
          balance_updated_at: string
          currency: string
          onboarding_completed: boolean
          created_at: string
        }
        Insert: {
          id: string
          balance?: number
          balance_updated_at?: string
          currency?: string
          onboarding_completed?: boolean
          created_at?: string
        }
        Update: {
          balance?: number
          balance_updated_at?: string
          currency?: string
          onboarding_completed?: boolean
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          type: 'expense' | 'income'
          icon: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          type: 'expense' | 'income'
          icon?: string
        }
        Update: {
          name?: string
          color?: string
          type?: 'expense' | 'income'
          icon?: string
        }
      }
      category_rules: {
        Row: {
          id: string
          user_id: string
          keyword: string
          category_id: string
          priority: number
        }
        Insert: {
          id?: string
          user_id: string
          keyword: string
          category_id: string
          priority?: number
        }
        Update: {
          keyword?: string
          category_id?: string
          priority?: number
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          date: string
          description: string
          amount: number
          category_id: string | null
          source: 'csv' | 'manual'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          description: string
          amount: number
          category_id?: string | null
          source: 'csv' | 'manual'
          created_at?: string
        }
        Update: {
          date?: string
          description?: string
          amount?: number
          category_id?: string | null
          source?: 'csv' | 'manual'
        }
      }
      recurring_items: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          type: 'expense' | 'income'
          frequency: 'monthly' | 'weekly' | 'quinzenal' | 'yearly'
          day_of_month: number | null
          day_of_week: number | null
          next_date: string
          active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          type: 'expense' | 'income'
          frequency: 'monthly' | 'weekly' | 'quinzenal' | 'yearly'
          day_of_month?: number | null
          day_of_week?: number | null
          next_date: string
          active?: boolean
        }
        Update: {
          name?: string
          amount?: number
          type?: 'expense' | 'income'
          frequency?: 'monthly' | 'weekly' | 'quinzenal' | 'yearly'
          day_of_month?: number | null
          day_of_week?: number | null
          next_date?: string
          active?: boolean
        }
      }
      user_settings: {
        Row: {
          user_id: string
          csv_column_date: string | null
          csv_column_description: string | null
          csv_column_amount: string | null
          csv_negative_is_expense: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          csv_column_date?: string | null
          csv_column_description?: string | null
          csv_column_amount?: string | null
          csv_negative_is_expense?: boolean
          updated_at?: string
        }
        Update: {
          csv_column_date?: string | null
          csv_column_description?: string | null
          csv_column_amount?: string | null
          csv_negative_is_expense?: boolean
          updated_at?: string
        }
      }
    }
    Enums: {}
  }
}
