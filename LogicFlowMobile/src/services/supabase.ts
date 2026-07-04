import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kgyhbimpwwtnkiozymyr.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtneWhiaW1wd3d0bmtpb3p5bXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjUxMDEsImV4cCI6MjA5NjcwMTEwMX0.Ob03jI480Wc6dAxOgyXP3HgPd9sKrFtApFdhvsXaIj8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export type Database = {
  public: {
    Tables: {
      progreso_usuario: {
        Row: {
          id: string
          user_id: string
          componentes_instalados: string[]
          paso_actual: number
          total_componentes: number
          simulaciones_completadas: number
          ultimo_componente: string | null
          tiempo_total_segundos: number
          completed_at: string | null
          created_at: string
          updated_at: string
          nota_web: number | null
          foto_simulador_path: string | null
          web_aprobado_at: string | null
          movil_completado_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['progreso_usuario']['Row']>
        Update: Partial<Database['public']['Tables']['progreso_usuario']['Row']>
      }
      eventos_simulacion: {
        Row: {
          id: string
          user_id: string
          tipo: 'acierto' | 'error_pieza' | 'demora' | 'error_ensamble' | 'acierto_ensamble'
          componente: string | null
          componente_esperado: string | null
          segundos: number
          detalle: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['eventos_simulacion']['Row']>
      }
      logros_usuario: {
        Row: {
          user_id: string
          logro_id: string
          contexto: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['logros_usuario']['Row']>
      }
      certificados: {
        Row: {
          user_id: string
          emitido_at: string
          tiempo_total_segundos: number
          nota_web: number | null
          foto_simulador_path: string | null
          foto_real_path: string | null
          logros_total: number
        }
        Insert: Partial<Database['public']['Tables']['certificados']['Row']>
        Update: Partial<Database['public']['Tables']['certificados']['Row']>
      }
    }
  }
}
