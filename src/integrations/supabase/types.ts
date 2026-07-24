export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_name: string | null
          actor_role: string | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json
          school_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          school_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          school_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          author_id: string | null
          content: string
          created_at: string
          id: string
          school_id: string
          title: string
        }
        Insert: {
          audience?: string
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          school_id?: string
          title: string
        }
        Update: {
          audience?: string
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          school_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_schedules: {
        Row: {
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          enabled: boolean
          frequency: string
          hour_of_day: number
          id: string
          last_run_at: string | null
          next_run_at: string | null
          retention_days: number
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          enabled?: boolean
          frequency?: string
          hour_of_day?: number
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          retention_days?: number
          school_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          enabled?: boolean
          frequency?: string
          hour_of_day?: number
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          retention_days?: number
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_schedules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          kind: string
          notes: string | null
          row_counts: Json
          school_id: string
          scope: string
          size_bytes: number
          status: string
          storage_path: string | null
          tables: string[]
          total_rows: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          kind?: string
          notes?: string | null
          row_counts?: Json
          school_id?: string
          scope?: string
          size_bytes?: number
          status?: string
          storage_path?: string | null
          tables?: string[]
          total_rows?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          kind?: string
          notes?: string | null
          row_counts?: Json
          school_id?: string
          scope?: string
          size_bytes?: number
          status?: string
          storage_path?: string | null
          tables?: string[]
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "backups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          annual_fee: number
          created_at: string
          id: string
          level: string
          name: string
          school_id: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          annual_fee?: number
          created_at?: string
          id?: string
          level: string
          name: string
          school_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          annual_fee?: number
          created_at?: string
          id?: string
          level?: string
          name?: string
          school_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_contracts: {
        Row: {
          base_salary: number
          created_at: string
          end_date: string | null
          full_name: string
          id: string
          notes: string | null
          position: string
          school_id: string
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          base_salary?: number
          created_at?: string
          end_date?: string | null
          full_name: string
          id?: string
          notes?: string | null
          position: string
          school_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          base_salary?: number
          created_at?: string
          end_date?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          position?: string
          school_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_contracts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contracts_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_leaves: {
        Row: {
          contract_id: string
          created_at: string
          end_date: string
          id: string
          reason: string | null
          school_id: string
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          type: Database["public"]["Enums"]["leave_type"]
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          school_id?: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          type: Database["public"]["Enums"]["leave_type"]
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          school_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          type?: Database["public"]["Enums"]["leave_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_leaves_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employee_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leaves_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string
          coefficient: number
          created_at: string
          duration_minutes: number
          exam_date: string
          id: string
          notes: string | null
          room_id: string | null
          school_id: string
          start_time: string | null
          subject_id: string
          supervisor_id: string | null
          title: string
          type: Database["public"]["Enums"]["exam_type"]
          updated_at: string
        }
        Insert: {
          class_id: string
          coefficient?: number
          created_at?: string
          duration_minutes?: number
          exam_date: string
          id?: string
          notes?: string | null
          room_id?: string | null
          school_id?: string
          start_time?: string | null
          subject_id: string
          supervisor_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["exam_type"]
          updated_at?: string
        }
        Update: {
          class_id?: string
          coefficient?: number
          created_at?: string
          duration_minutes?: number
          exam_date?: string
          id?: string
          notes?: string | null
          room_id?: string | null
          school_id?: string
          start_time?: string | null
          subject_id?: string
          supervisor_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["exam_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string
          amount: number
          beneficiary: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          occurred_at: string
          reference: string | null
          school_id: string
          type: Database["public"]["Enums"]["expense_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          beneficiary?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          occurred_at?: string
          reference?: string | null
          school_id?: string
          type: Database["public"]["Enums"]["expense_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          beneficiary?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          occurred_at?: string
          reference?: string | null
          school_id?: string
          type?: Database["public"]["Enums"]["expense_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_accounts: {
        Row: {
          created_at: string
          currency: string
          id: string
          initial_balance: number
          name: string
          notes: string | null
          school_id: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          initial_balance?: number
          name: string
          notes?: string | null
          school_id?: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          initial_balance?: number
          name?: string
          notes?: string | null
          school_id?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          evaluation_type: string | null
          id: string
          max_score: number
          period: string
          recorded_by: string | null
          school_id: string
          score: number
          student_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          evaluation_type?: string | null
          id?: string
          max_score?: number
          period: string
          recorded_by?: string | null
          school_id?: string
          score: number
          student_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          evaluation_type?: string | null
          id?: string
          max_score?: number
          period?: string
          recorded_by?: string | null
          school_id?: string
          score?: number
          student_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      library_books: {
        Row: {
          author: string | null
          available_copies: number
          category_id: string | null
          created_at: string
          id: string
          isbn: string | null
          notes: string | null
          school_id: string
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          author?: string | null
          available_copies?: number
          category_id?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          notes?: string | null
          school_id?: string
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          author?: string | null
          available_copies?: number
          category_id?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          notes?: string | null
          school_id?: string
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "library_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_books_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      library_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      library_loans: {
        Row: {
          book_id: string
          borrower_name: string
          created_at: string
          due_date: string
          id: string
          loan_date: string
          notes: string | null
          penalty: number
          return_date: string | null
          school_id: string
          student_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          book_id: string
          borrower_name: string
          created_at?: string
          due_date: string
          id?: string
          loan_date?: string
          notes?: string | null
          penalty?: number
          return_date?: string | null
          school_id?: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          borrower_name?: string
          created_at?: string
          due_date?: string
          id?: string
          loan_date?: string
          notes?: string | null
          penalty?: number
          return_date?: string | null
          school_id?: string
          student_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_loans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_loans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_loans_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      message_broadcasts: {
        Row: {
          author_id: string
          body: string
          channel: string
          created_at: string
          id: string
          school_id: string
          subject: string
          target_class_id: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          author_id: string
          body: string
          channel?: string
          created_at?: string
          id?: string
          school_id?: string
          subject: string
          target_class_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          author_id?: string
          body?: string
          channel?: string
          created_at?: string
          id?: string
          school_id?: string
          subject?: string
          target_class_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "message_broadcasts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_broadcasts_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          school_id: string
          sender_id: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          school_id?: string
          sender_id: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          school_id?: string
          sender_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          link: string | null
          metadata: Json
          read_at: string | null
          school_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          school_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          school_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          payment_method: string | null
          payment_type: string
          period: string | null
          proof_url: string | null
          receipt_number: string | null
          recorded_by: string | null
          rejection_reason: string | null
          school_id: string
          status: string
          student_id: string
          transaction_reference: string | null
          validated_at: string | null
          validated_by: string | null
          validation_status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          payment_type: string
          period?: string | null
          proof_url?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          rejection_reason?: string | null
          school_id?: string
          status?: string
          student_id: string
          transaction_reference?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          payment_type?: string
          period?: string | null
          proof_url?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          rejection_reason?: string | null
          school_id?: string
          status?: string
          student_id?: string
          transaction_reference?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          advances: number
          base_salary: number
          bonuses: number
          contract_id: string
          created_at: string
          deductions: number
          id: string
          net_pay: number
          notes: string | null
          overtime_amount: number
          overtime_hours: number
          paid: boolean
          paid_at: string | null
          period_month: number
          period_year: number
          school_id: string
          updated_at: string
        }
        Insert: {
          advances?: number
          base_salary?: number
          bonuses?: number
          contract_id: string
          created_at?: string
          deductions?: number
          id?: string
          net_pay?: number
          notes?: string | null
          overtime_amount?: number
          overtime_hours?: number
          paid?: boolean
          paid_at?: string | null
          period_month: number
          period_year: number
          school_id?: string
          updated_at?: string
        }
        Update: {
          advances?: number
          base_salary?: number
          bonuses?: number
          contract_id?: string
          created_at?: string
          deductions?: number
          id?: string
          net_pay?: number
          notes?: string | null
          overtime_amount?: number
          overtime_hours?: number
          paid?: boolean
          paid_at?: string | null
          period_month?: number
          period_year?: number
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employee_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          school_id?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_counters: {
        Row: {
          last_seq: number
          school_id: string
          year: number
        }
        Insert: {
          last_seq?: number
          school_id: string
          year: number
        }
        Update: {
          last_seq?: number
          school_id?: string
          year?: number
        }
        Relationships: []
      }
      revenues: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          occurred_at: string
          reference: string | null
          school_id: string
          student_id: string | null
          type: Database["public"]["Enums"]["revenue_type"]
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          occurred_at?: string
          reference?: string | null
          school_id?: string
          student_id?: string | null
          type: Database["public"]["Enums"]["revenue_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          occurred_at?: string
          reference?: string | null
          school_id?: string
          student_id?: string | null
          type?: Database["public"]["Enums"]["revenue_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenues_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "financial_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenues_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          building: string | null
          capacity: number
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          building?: string | null
          capacity?: number
          created_at?: string
          id?: string
          name: string
          school_id?: string
          updated_at?: string
        }
        Update: {
          building?: string | null
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_slots: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room_id: string | null
          school_id: string
          start_time: string
          subject_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room_id?: string | null
          school_id?: string
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room_id?: string | null
          school_id?: string
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_slots_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_slots_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_slots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          current_period_end: string
          current_period_start: string
          external_reference: string | null
          id: string
          last_payment_amount: number | null
          last_payment_at: string | null
          metadata: Json
          payment_provider: string | null
          plan_id: string
          school_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          external_reference?: string | null
          id?: string
          last_payment_amount?: number | null
          last_payment_at?: string | null
          metadata?: Json
          payment_provider?: string | null
          plan_id: string
          school_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          external_reference?: string | null
          id?: string
          last_payment_amount?: number | null
          last_payment_at?: string | null
          metadata?: Json
          payment_provider?: string | null
          plan_id?: string
          school_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          academic_year: string | null
          address: string | null
          bulletin_settings: Json
          city: string | null
          code: string | null
          created_at: string
          currency: string
          director_name: string | null
          director_signature_url: string | null
          email: string | null
          id: string
          last_activity_at: string | null
          logo_url: string | null
          name: string
          period_system: string
          phone: string | null
          receipt_accent_color: string | null
          receipt_footer_note: string | null
          receipt_header: string | null
          receipt_legal_notice: string | null
          receipt_prefix: string | null
          receipt_settings: Json
          receipt_title: string | null
          school_stamp_url: string | null
          status: string
          theme_primary: string | null
          theme_secondary: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          academic_year?: string | null
          address?: string | null
          bulletin_settings?: Json
          city?: string | null
          code?: string | null
          created_at?: string
          currency?: string
          director_name?: string | null
          director_signature_url?: string | null
          email?: string | null
          id?: string
          last_activity_at?: string | null
          logo_url?: string | null
          name: string
          period_system?: string
          phone?: string | null
          receipt_accent_color?: string | null
          receipt_footer_note?: string | null
          receipt_header?: string | null
          receipt_legal_notice?: string | null
          receipt_prefix?: string | null
          receipt_settings?: Json
          receipt_title?: string | null
          school_stamp_url?: string | null
          status?: string
          theme_primary?: string | null
          theme_secondary?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          academic_year?: string | null
          address?: string | null
          bulletin_settings?: Json
          city?: string | null
          code?: string | null
          created_at?: string
          currency?: string
          director_name?: string | null
          director_signature_url?: string | null
          email?: string | null
          id?: string
          last_activity_at?: string | null
          logo_url?: string | null
          name?: string
          period_system?: string
          phone?: string | null
          receipt_accent_color?: string | null
          receipt_footer_note?: string | null
          receipt_header?: string | null
          receipt_legal_notice?: string | null
          receipt_prefix?: string | null
          receipt_settings?: Json
          receipt_title?: string | null
          school_stamp_url?: string | null
          status?: string
          theme_primary?: string | null
          theme_secondary?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      student_attendance: {
        Row: {
          class_id: string | null
          created_at: string
          date: string
          id: string
          justification: string | null
          justified: boolean
          minutes_late: number | null
          recorded_by: string | null
          school_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          date?: string
          id?: string
          justification?: string | null
          justified?: boolean
          minutes_late?: number | null
          recorded_by?: string | null
          school_id?: string
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          date?: string
          id?: string
          justification?: string | null
          justified?: boolean
          minutes_late?: number | null
          recorded_by?: string | null
          school_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          parent_user_id: string
          relation: string
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_user_id: string
          relation?: string
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_user_id?: string
          relation?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          birth_date: string | null
          birth_place: string | null
          class_id: string | null
          created_at: string
          enrollment_date: string | null
          full_name: string
          gender: string | null
          id: string
          matricule: string
          parent_name: string | null
          parent_phone: string | null
          parent_user_id: string | null
          photo_url: string | null
          school_id: string
          status: string
          student_user_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          class_id?: string | null
          created_at?: string
          enrollment_date?: string | null
          full_name: string
          gender?: string | null
          id?: string
          matricule: string
          parent_name?: string | null
          parent_phone?: string | null
          parent_user_id?: string | null
          photo_url?: string | null
          school_id?: string
          status?: string
          student_user_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          class_id?: string | null
          created_at?: string
          enrollment_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          matricule?: string
          parent_name?: string | null
          parent_phone?: string | null
          parent_user_id?: string | null
          photo_url?: string | null
          school_id?: string
          status?: string
          student_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          coefficient: number
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          coefficient?: number
          created_at?: string
          id?: string
          name: string
          school_id?: string
        }
        Update: {
          coefficient?: number
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          currency: string
          description: string | null
          display_order: number
          features: Json
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price_monthly: number
          price_yearly: number
          student_limit: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price_monthly?: number
          price_yearly?: number
          student_limit?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price_monthly?: number
          price_yearly?: number
          student_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      super_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          justification: string | null
          justified: boolean
          minutes_late: number | null
          recorded_by: string | null
          school_id: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          justification?: string | null
          justified?: boolean
          minutes_late?: number | null
          recorded_by?: string | null
          school_id?: string
          status: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          justification?: string | null
          justified?: boolean
          minutes_late?: number | null
          recorded_by?: string | null
          school_id?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class_assignments: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string
          id: string
          school_id: string
          subject_id: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          class_id: string
          created_at?: string
          id?: string
          school_id?: string
          subject_id?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          subject_id?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          matricule: string
          monthly_salary: number | null
          phone: string | null
          school_id: string
          subjects: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          matricule: string
          monthly_salary?: number | null
          phone?: string | null
          school_id?: string
          subjects?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          matricule?: string
          monthly_salary?: number | null
          phone?: string | null
          school_id?: string
          subjects?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_suspend_expired_subscriptions: { Args: never; Returns: number }
      current_school_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_finance: { Args: { _user_id: string }; Returns: boolean }
      is_parent_of_student: {
        Args: { _student_id: string; _uid: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _uid: string }; Returns: boolean }
      next_receipt_number: { Args: { _school_id: string }; Returns: string }
      same_school: { Args: { _school_id: string }; Returns: boolean }
      school_storage_usage: {
        Args: never
        Returns: {
          bytes: number
          files: number
          school_id: string
        }[]
      }
      student_recipient_users: {
        Args: { _student_id: string }
        Returns: {
          user_id: string
        }[]
      }
      teacher_teaches_class: {
        Args: { _class_id: string; _uid: string }
        Returns: boolean
      }
      teacher_teaches_student: {
        Args: { _student_id: string; _uid: string }
        Returns: boolean
      }
      verify_receipt: {
        Args: { _receipt_number: string }
        Returns: {
          amount: number
          class_name: string
          paid_at: string
          payment_method: string
          payment_type: string
          period: string
          receipt_number: string
          school_address: string
          school_logo_url: string
          school_name: string
          student_name: string
          validation_status: string
        }[]
      }
    }
    Enums: {
      account_type:
        | "caisse"
        | "banque"
        | "mobile_money"
        | "orange_money"
        | "autre"
      app_role:
        | "admin"
        | "directeur"
        | "enseignant"
        | "parent"
        | "eleve"
        | "comptable"
      contract_status: "actif" | "suspendu" | "termine"
      exam_type: "composition" | "devoir" | "controle" | "examen"
      expense_type:
        | "salaires"
        | "fournitures"
        | "eau"
        | "electricite"
        | "internet"
        | "entretien"
        | "carburant"
        | "autres"
      leave_status: "en_attente" | "approuve" | "refuse"
      leave_type: "annuel" | "maladie" | "maternite" | "sans_solde" | "autre"
      payment_method:
        | "especes"
        | "cheque"
        | "virement"
        | "mobile_money"
        | "orange_money"
        | "autre"
      revenue_type:
        | "inscription"
        | "reinscription"
        | "scolarite"
        | "transport"
        | "cantine"
        | "uniforme"
        | "examens"
        | "autres"
      subscription_status:
        | "trial"
        | "active"
        | "past_due"
        | "canceled"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: [
        "caisse",
        "banque",
        "mobile_money",
        "orange_money",
        "autre",
      ],
      app_role: [
        "admin",
        "directeur",
        "enseignant",
        "parent",
        "eleve",
        "comptable",
      ],
      contract_status: ["actif", "suspendu", "termine"],
      exam_type: ["composition", "devoir", "controle", "examen"],
      expense_type: [
        "salaires",
        "fournitures",
        "eau",
        "electricite",
        "internet",
        "entretien",
        "carburant",
        "autres",
      ],
      leave_status: ["en_attente", "approuve", "refuse"],
      leave_type: ["annuel", "maladie", "maternite", "sans_solde", "autre"],
      payment_method: [
        "especes",
        "cheque",
        "virement",
        "mobile_money",
        "orange_money",
        "autre",
      ],
      revenue_type: [
        "inscription",
        "reinscription",
        "scolarite",
        "transport",
        "cantine",
        "uniforme",
        "examens",
        "autres",
      ],
      subscription_status: [
        "trial",
        "active",
        "past_due",
        "canceled",
        "expired",
      ],
    },
  },
} as const
