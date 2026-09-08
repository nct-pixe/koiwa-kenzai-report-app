export type StaffRole = 'staff' | 'manager' | 'hq'
export type ReportCategory = '失敗談' | '成功談' | '市況情報' | 'クレーム' | '会合' | 'メーカー情報' | 'その他'
export type TopicCategory = 'イベント情報' | '課題' | '問題点' | '改善策' | 'その他'
export type PerformanceCategory = 'general'
export type StoreType = 'headquarters' | 'branch'

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: { id: string; name: string; type: StoreType; created_at: string }
        Insert: { id?: string; name: string; type?: StoreType; created_at?: string }
        Update: { id?: string; name?: string; type?: StoreType; created_at?: string }
        Relationships: []
      }
      staff: {
        Row: {
          id: string
          staff_code: string
          name: string
          role: StaffRole
          store_id: string
          auth_user_id: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          staff_code: string
          name: string
          role?: StaffRole
          store_id: string
          auth_user_id?: string | null
          active?: boolean
          created_at?: string
        }
        Update: Partial<{
          id: string
          staff_code: string
          name: string
          role: StaffRole
          store_id: string
          auth_user_id: string | null
          active: boolean
          created_at: string
        }>
        Relationships: [
          {
            foreignKeyName: 'staff_store_id_fkey'
            columns: ['store_id']
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      daily_logs: {
        Row: {
          id: string
          staff_id: string
          log_date: string
          content: string
          customer_name: string | null
          purpose: string | null
          contact_person: string | null
          customer_reaction: string | null
          proposal_content: string | null
          progress_status: string | null
          issues: string | null
          next_action: string | null
          next_action_assignee: string | null
          next_visit_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          log_date: string
          content: string
          customer_name?: string | null
          purpose?: string | null
          contact_person?: string | null
          customer_reaction?: string | null
          proposal_content?: string | null
          progress_status?: string | null
          issues?: string | null
          next_action?: string | null
          next_action_assignee?: string | null
          next_visit_date?: string | null
          created_at?: string
        }
        Update: Partial<{
          id: string
          staff_id: string
          log_date: string
          content: string
          customer_name: string | null
          purpose: string | null
          contact_person: string | null
          customer_reaction: string | null
          proposal_content: string | null
          progress_status: string | null
          issues: string | null
          next_action: string | null
          next_action_assignee: string | null
          next_visit_date: string | null
          created_at: string
        }>
        Relationships: [
          {
            foreignKeyName: 'daily_logs_staff_id_fkey'
            columns: ['staff_id']
            referencedRelation: 'staff'
            referencedColumns: ['id']
          },
        ]
      }
      report_items: {
        Row: {
          id: string
          staff_id: string
          week_start: string
          category: ReportCategory
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          week_start: string
          category: ReportCategory
          content: string
          created_at?: string
        }
        Update: Partial<{
          id: string
          staff_id: string
          week_start: string
          category: ReportCategory
          content: string
          created_at: string
        }>
        Relationships: [
          {
            foreignKeyName: 'report_items_staff_id_fkey'
            columns: ['staff_id']
            referencedRelation: 'staff'
            referencedColumns: ['id']
          },
        ]
      }
      plan_items: {
        Row: { id: string; staff_id: string; plan_date: string; content: string; created_at: string }
        Insert: { id?: string; staff_id: string; plan_date: string; content: string; created_at?: string }
        Update: Partial<{ id: string; staff_id: string; plan_date: string; content: string; created_at: string }>
        Relationships: [
          {
            foreignKeyName: 'plan_items_staff_id_fkey'
            columns: ['staff_id']
            referencedRelation: 'staff'
            referencedColumns: ['id']
          },
        ]
      }
      topics: {
        Row: {
          id: string
          staff_id: string
          week_start: string
          category: TopicCategory
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          week_start: string
          category: TopicCategory
          content: string
          created_at?: string
        }
        Update: Partial<{
          id: string
          staff_id: string
          week_start: string
          category: TopicCategory
          content: string
          created_at: string
        }>
        Relationships: [
          {
            foreignKeyName: 'topics_staff_id_fkey'
            columns: ['staff_id']
            referencedRelation: 'staff'
            referencedColumns: ['id']
          },
        ]
      }
      deals: {
        Row: {
          id: string
          staff_id: string
          store_id: string
          deal_date: string
          deal_name: string
          sales_amount: number
          profit_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          store_id: string
          deal_date: string
          deal_name: string
          sales_amount?: number
          profit_amount?: number
          created_at?: string
        }
        Update: Partial<{
          id: string
          staff_id: string
          store_id: string
          deal_date: string
          deal_name: string
          sales_amount: number
          profit_amount: number
          created_at: string
        }>
        Relationships: [
          {
            foreignKeyName: 'deals_staff_id_fkey'
            columns: ['staff_id']
            referencedRelation: 'staff'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deals_store_id_fkey'
            columns: ['store_id']
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
        ]
      }
      monthly_targets: {
        Row: {
          id: string
          staff_id: string
          target_month: string
          category: PerformanceCategory
          sales_target: number
          profit_target: number
          prev_year_sales: number | null
          prev_year_profit: number | null
          set_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          target_month: string
          category?: PerformanceCategory
          sales_target?: number
          profit_target?: number
          prev_year_sales?: number | null
          prev_year_profit?: number | null
          set_by?: string | null
          created_at?: string
        }
        Update: Partial<{
          id: string
          staff_id: string
          target_month: string
          category: PerformanceCategory
          sales_target: number
          profit_target: number
          prev_year_sales: number | null
          prev_year_profit: number | null
          set_by: string | null
          created_at: string
        }>
        Relationships: [
          {
            foreignKeyName: 'monthly_targets_staff_id_fkey'
            columns: ['staff_id']
            referencedRelation: 'staff'
            referencedColumns: ['id']
          },
        ]
      }
      performance_reports: {
        Row: {
          id: string
          staff_id: string
          target_month: string
          category: PerformanceCategory
          cumulative_sales: number
          cumulative_profit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          staff_id: string
          target_month: string
          category: PerformanceCategory
          cumulative_sales?: number
          cumulative_profit?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          id: string
          staff_id: string
          target_month: string
          category: PerformanceCategory
          cumulative_sales: number
          cumulative_profit: number
          created_at: string
          updated_at: string
        }>
        Relationships: [
          {
            foreignKeyName: 'performance_reports_staff_id_fkey'
            columns: ['staff_id']
            referencedRelation: 'staff'
            referencedColumns: ['id']
          },
        ]
      }
      performance_report_daily: {
        Row: {
          id: string
          staff_id: string
          target_month: string
          snapshot_date: string
          cumulative_sales: number
          cumulative_profit: number
        }
        Insert: {
          id?: string
          staff_id: string
          target_month: string
          snapshot_date?: string
          cumulative_sales?: number
          cumulative_profit?: number
        }
        Update: Partial<{
          id: string
          staff_id: string
          target_month: string
          snapshot_date: string
          cumulative_sales: number
          cumulative_profit: number
        }>
        Relationships: [
          {
            foreignKeyName: 'performance_report_daily_staff_id_fkey'
            columns: ['staff_id']
            referencedRelation: 'staff'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_profit_ranking: {
        Args: { p_target_month: string }
        Returns: {
          staff_id: string
          name: string
          store_name: string
          cumulative_profit: number
          profit_target: number | null
          prev_year_profit: number | null
          profit_achievement_pct: number | null
          cumulative_sales: number
          sales_target: number | null
          prev_year_sales: number | null
          achievement_pct: number | null
          rank: number
        }[]
      }
      get_store_profit_ranking: {
        Args: { p_target_month: string }
        Returns: {
          store_id: string
          store_name: string
          cumulative_profit: number
          profit_target: number
          prev_year_profit: number
          profit_achievement_pct: number | null
          cumulative_sales: number
          sales_target: number
          prev_year_sales: number
          achievement_pct: number | null
          rank: number
        }[]
      }
      get_store_monthly_trend: {
        Args: { p_store_id: string; p_months?: number }
        Returns: {
          target_month: string
          sales_actual: number
          sales_target: number
          prev_year_sales: number
        }[]
      }
      get_store_daily_trend: {
        Args: { p_store_id: string; p_target_month: string }
        Returns: {
          snapshot_date: string
          sales_actual: number
        }[]
      }
    }
    Enums: {
      staff_role: StaffRole
      report_category: ReportCategory
      topic_category: TopicCategory
      performance_category: PerformanceCategory
      store_type: StoreType
    }
    CompositeTypes: Record<string, never>
  }
}
