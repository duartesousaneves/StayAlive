export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          currency: string
          onboarding_completed: boolean
          created_at: string
        }
        Insert: {
          id: string
          currency?: string
          onboarding_completed?: boolean
          created_at?: string
        }
        Update: {
          currency?: string
          onboarding_completed?: boolean
        }
        Relationships: []
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'checking' | 'credit_card' | 'cash'
          balance: number
          balance_updated_at: string | null
          credit_limit: number | null
          statement_close_day: number | null
          currency: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          type: 'checking' | 'credit_card' | 'cash'
          balance?: number
          balance_updated_at?: string | null
          credit_limit?: number | null
          statement_close_day?: number | null
          currency?: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          type?: 'checking' | 'credit_card' | 'cash'
          balance?: number
          balance_updated_at?: string | null
          credit_limit?: number | null
          statement_close_day?: number | null
          currency?: string
          is_default?: boolean
        }
        Relationships: []
      }
      transaction_tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          name?: string
          color?: string
        }
        Relationships: []
      }
      transaction_tag_assignments: {
        Row: {
          transaction_id: string
          tag_id: string
        }
        Insert: {
          transaction_id: string
          tag_id: string
        }
        Update: Record<string, never>
        Relationships: [
          {
            foreignKeyName: 'transaction_tag_assignments_transaction_id_fkey'
            columns: ['transaction_id']
            isOneToOne: false
            referencedRelation: 'transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transaction_tag_assignments_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'transaction_tags'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: []
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
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          date: string
          description: string
          amount: number
          category_id: string | null
          account_id: string | null
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
          account_id?: string | null
          source: 'csv' | 'manual'
          created_at?: string
        }
        Update: {
          date?: string
          description?: string
          amount?: number
          category_id?: string | null
          account_id?: string | null
          source?: 'csv' | 'manual'
        }
        Relationships: []
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
          category_id: string | null
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
          category_id?: string | null
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
          category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'recurring_items_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          }
        ]
      }
      planned_items: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          type: 'expense' | 'income'
          planned_date: string
          category_id: string | null
          notes: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          amount: number
          type: 'expense' | 'income'
          planned_date: string
          category_id?: string | null
          notes?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          amount?: number
          type?: 'expense' | 'income'
          planned_date?: string
          category_id?: string | null
          notes?: string | null
          active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'planned_items_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          }
        ]
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
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      set_default_account: {
        Args: { p_account_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
  }
}
