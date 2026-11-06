
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "cartao_ciclos": {
                  Row: {
                    "cartao_id": string,"created_at": string,"created_by": string,"dia_fechamento": number,"dia_vencimento": number,"id": string,"is_deleted": boolean,"updated_at": string,"vigente_desde": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cartao_id": string,"created_at"?: string,"created_by"?: string,"dia_fechamento": number,"dia_vencimento": number,"id"?: string,"is_deleted"?: boolean,"updated_at"?: string,"vigente_desde": string
                  }
                  Update: {
                    "cartao_id"?: string,"created_at"?: string,"created_by"?: string,"dia_fechamento"?: number,"dia_vencimento"?: number,"id"?: string,"is_deleted"?: boolean,"updated_at"?: string,"vigente_desde"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cartao_ciclos_cartao_id_created_by_fkey"
      columns: ["cartao_id","created_by"]
isOneToOne: false
      referencedRelation: "cartoes"
      referencedColumns: ["id","created_by"]
    }
                  ]
                },"cartoes": {
                  Row: {
                    "arquivado": boolean,"competencia_inicial": string,"conta_pagamento_id": string,"cor": string,"created_at": string,"created_by": string,"id": string,"instituicao": string | null,"is_deleted": boolean,"limite": number,"nome": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arquivado"?: boolean,"competencia_inicial": string,"conta_pagamento_id": string,"cor": string,"created_at"?: string,"created_by"?: string,"id"?: string,"instituicao"?: string | null,"is_deleted"?: boolean,"limite": number,"nome": string,"updated_at"?: string
                  }
                  Update: {
                    "arquivado"?: boolean,"competencia_inicial"?: string,"conta_pagamento_id"?: string,"cor"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"instituicao"?: string | null,"is_deleted"?: boolean,"limite"?: number,"nome"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cartoes_conta_pagamento_id_created_by_fkey"
      columns: ["conta_pagamento_id","created_by"]
isOneToOne: false
      referencedRelation: "contas"
      referencedColumns: ["id","created_by"]
    }
                  ]
                },"categorias": {
                  Row: {
                    "categoria_pai_id": string | null,"cor": string | null,"created_at": string,"created_by": string,"icone": string,"id": string,"is_deleted": boolean,"nome": string,"sistema": string | null,"tipo": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_pai_id"?: string | null,"cor"?: string | null,"created_at"?: string,"created_by"?: string,"icone": string,"id"?: string,"is_deleted"?: boolean,"nome": string,"sistema"?: string | null,"tipo": string,"updated_at"?: string
                  }
                  Update: {
                    "categoria_pai_id"?: string | null,"cor"?: string | null,"created_at"?: string,"created_by"?: string,"icone"?: string,"id"?: string,"is_deleted"?: boolean,"nome"?: string,"sistema"?: string | null,"tipo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categorias_categoria_pai_id_created_by_fkey"
      columns: ["categoria_pai_id","created_by"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id","created_by"]
    }
                  ]
                },"compras": {
                  Row: {
                    "cancelada": boolean,"cartao_id": string,"categoria_id": string,"created_at": string,"created_by": string,"data": string,"descricao": string | null,"id": string,"is_deleted": boolean,"numero_parcelas": number,"observacao": string | null,"updated_at": string,"valor_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelada"?: boolean,"cartao_id": string,"categoria_id": string,"created_at"?: string,"created_by"?: string,"data": string,"descricao"?: string | null,"id"?: string,"is_deleted"?: boolean,"numero_parcelas"?: number,"observacao"?: string | null,"updated_at"?: string,"valor_total": number
                  }
                  Update: {
                    "cancelada"?: boolean,"cartao_id"?: string,"categoria_id"?: string,"created_at"?: string,"created_by"?: string,"data"?: string,"descricao"?: string | null,"id"?: string,"is_deleted"?: boolean,"numero_parcelas"?: number,"observacao"?: string | null,"updated_at"?: string,"valor_total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "compras_cartao_id_created_by_fkey"
      columns: ["cartao_id","created_by"]
isOneToOne: false
      referencedRelation: "cartoes"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "compras_categoria_id_created_by_fkey"
      columns: ["categoria_id","created_by"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id","created_by"]
    }
                  ]
                },"contas": {
                  Row: {
                    "arquivada": boolean,"cor": string,"created_at": string,"created_by": string,"data_saldo_inicial": string,"id": string,"incluir_no_total": boolean,"instituicao": string | null,"is_deleted": boolean,"nome": string,"saldo_inicial": number,"tipo": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arquivada"?: boolean,"cor": string,"created_at"?: string,"created_by"?: string,"data_saldo_inicial": string,"id"?: string,"incluir_no_total"?: boolean,"instituicao"?: string | null,"is_deleted"?: boolean,"nome": string,"saldo_inicial": number,"tipo": string,"updated_at"?: string
                  }
                  Update: {
                    "arquivada"?: boolean,"cor"?: string,"created_at"?: string,"created_by"?: string,"data_saldo_inicial"?: string,"id"?: string,"incluir_no_total"?: boolean,"instituicao"?: string | null,"is_deleted"?: boolean,"nome"?: string,"saldo_inicial"?: number,"tipo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"dividas": {
                  Row: {
                    "categoria_id": string | null,"conta_debito_id": string,"created_at": string,"created_by": string,"credor": string,"data_contratacao": string,"data_primeira_parcela": string,"destino_do_valor": string,"id": string,"is_deleted": boolean,"numero_parcelas": number,"sistema_amortizacao": string,"taxa_mensal": number | null,"tipo": string,"updated_at": string,"valor_contratado": number,"valor_parcela_informada": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_id"?: string | null,"conta_debito_id": string,"created_at"?: string,"created_by"?: string,"credor": string,"data_contratacao": string,"data_primeira_parcela": string,"destino_do_valor": string,"id"?: string,"is_deleted"?: boolean,"numero_parcelas": number,"sistema_amortizacao": string,"taxa_mensal"?: number | null,"tipo": string,"updated_at"?: string,"valor_contratado": number,"valor_parcela_informada"?: number | null
                  }
                  Update: {
                    "categoria_id"?: string | null,"conta_debito_id"?: string,"created_at"?: string,"created_by"?: string,"credor"?: string,"data_contratacao"?: string,"data_primeira_parcela"?: string,"destino_do_valor"?: string,"id"?: string,"is_deleted"?: boolean,"numero_parcelas"?: number,"sistema_amortizacao"?: string,"taxa_mensal"?: number | null,"tipo"?: string,"updated_at"?: string,"valor_contratado"?: number,"valor_parcela_informada"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "dividas_categoria_id_created_by_fkey"
      columns: ["categoria_id","created_by"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "dividas_conta_debito_id_created_by_fkey"
      columns: ["conta_debito_id","created_by"]
isOneToOne: false
      referencedRelation: "contas"
      referencedColumns: ["id","created_by"]
    }
                  ]
                },"itens_fatura": {
                  Row: {
                    "cartao_id": string,"categoria_id": string | null,"competencia": string,"compra_id": string | null,"created_at": string,"created_by": string,"data": string,"descricao": string | null,"id": string,"is_deleted": boolean,"tipo": string,"updated_at": string,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cartao_id": string,"categoria_id"?: string | null,"competencia": string,"compra_id"?: string | null,"created_at"?: string,"created_by"?: string,"data": string,"descricao"?: string | null,"id"?: string,"is_deleted"?: boolean,"tipo": string,"updated_at"?: string,"valor": number
                  }
                  Update: {
                    "cartao_id"?: string,"categoria_id"?: string | null,"competencia"?: string,"compra_id"?: string | null,"created_at"?: string,"created_by"?: string,"data"?: string,"descricao"?: string | null,"id"?: string,"is_deleted"?: boolean,"tipo"?: string,"updated_at"?: string,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "itens_fatura_cartao_id_created_by_fkey"
      columns: ["cartao_id","created_by"]
isOneToOne: false
      referencedRelation: "cartoes"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "itens_fatura_categoria_id_created_by_fkey"
      columns: ["categoria_id","created_by"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "itens_fatura_compra_id_created_by_fkey"
      columns: ["compra_id","created_by"]
isOneToOne: false
      referencedRelation: "compras"
      referencedColumns: ["id","created_by"]
    }
                  ]
                },"lancamentos": {
                  Row: {
                    "cartao_id": string | null,"categoria_id": string | null,"conta_destino_id": string | null,"conta_id": string,"created_at": string,"created_by": string,"data": string,"descricao": string | null,"divida_id": string | null,"fatura_competencia": string | null,"id": string,"is_deleted": boolean,"observacao": string | null,"parcela_divida_id": string | null,"status": string,"tipo": string,"updated_at": string,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cartao_id"?: string | null,"categoria_id"?: string | null,"conta_destino_id"?: string | null,"conta_id": string,"created_at"?: string,"created_by"?: string,"data": string,"descricao"?: string | null,"divida_id"?: string | null,"fatura_competencia"?: string | null,"id"?: string,"is_deleted"?: boolean,"observacao"?: string | null,"parcela_divida_id"?: string | null,"status"?: string,"tipo": string,"updated_at"?: string,"valor": number
                  }
                  Update: {
                    "cartao_id"?: string | null,"categoria_id"?: string | null,"conta_destino_id"?: string | null,"conta_id"?: string,"created_at"?: string,"created_by"?: string,"data"?: string,"descricao"?: string | null,"divida_id"?: string | null,"fatura_competencia"?: string | null,"id"?: string,"is_deleted"?: boolean,"observacao"?: string | null,"parcela_divida_id"?: string | null,"status"?: string,"tipo"?: string,"updated_at"?: string,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lancamentos_cartao_id_created_by_fkey"
      columns: ["cartao_id","created_by"]
isOneToOne: false
      referencedRelation: "cartoes"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "lancamentos_categoria_id_created_by_fkey"
      columns: ["categoria_id","created_by"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "lancamentos_conta_destino_id_created_by_fkey"
      columns: ["conta_destino_id","created_by"]
isOneToOne: false
      referencedRelation: "contas"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "lancamentos_conta_id_created_by_fkey"
      columns: ["conta_id","created_by"]
isOneToOne: false
      referencedRelation: "contas"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "lancamentos_divida_id_created_by_fkey"
      columns: ["divida_id","created_by"]
isOneToOne: false
      referencedRelation: "dividas"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "lancamentos_parcela_divida_id_divida_id_created_by_fkey"
      columns: ["parcela_divida_id","divida_id","created_by"]
isOneToOne: false
      referencedRelation: "parcelas_divida"
      referencedColumns: ["id","divida_id","created_by"]
    }
                  ]
                },"ocorrencias": {
                  Row: {
                    "cartao_id": string | null,"categoria_id": string | null,"competencia": string,"compra_id": string | null,"conta_id": string | null,"created_at": string,"created_by": string,"data": string | null,"id": string,"is_deleted": boolean,"lancamento_id": string | null,"recorrencia_id": string,"situacao": string,"updated_at": string,"valor": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cartao_id"?: string | null,"categoria_id"?: string | null,"competencia": string,"compra_id"?: string | null,"conta_id"?: string | null,"created_at"?: string,"created_by"?: string,"data"?: string | null,"id"?: string,"is_deleted"?: boolean,"lancamento_id"?: string | null,"recorrencia_id": string,"situacao": string,"updated_at"?: string,"valor"?: number | null
                  }
                  Update: {
                    "cartao_id"?: string | null,"categoria_id"?: string | null,"competencia"?: string,"compra_id"?: string | null,"conta_id"?: string | null,"created_at"?: string,"created_by"?: string,"data"?: string | null,"id"?: string,"is_deleted"?: boolean,"lancamento_id"?: string | null,"recorrencia_id"?: string,"situacao"?: string,"updated_at"?: string,"valor"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ocorrencias_cartao_id_created_by_fkey"
      columns: ["cartao_id","created_by"]
isOneToOne: false
      referencedRelation: "cartoes"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "ocorrencias_categoria_id_created_by_fkey"
      columns: ["categoria_id","created_by"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "ocorrencias_compra_id_created_by_fkey"
      columns: ["compra_id","created_by"]
isOneToOne: false
      referencedRelation: "compras"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "ocorrencias_conta_id_created_by_fkey"
      columns: ["conta_id","created_by"]
isOneToOne: false
      referencedRelation: "contas"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "ocorrencias_lancamento_id_created_by_fkey"
      columns: ["lancamento_id","created_by"]
isOneToOne: false
      referencedRelation: "lancamentos"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "ocorrencias_recorrencia_id_created_by_fkey"
      columns: ["recorrencia_id","created_by"]
isOneToOne: false
      referencedRelation: "recorrencias"
      referencedColumns: ["id","created_by"]
    }
                  ]
                },"parcelas": {
                  Row: {
                    "competencia": string,"compra_id": string,"created_at": string,"created_by": string,"id": string,"is_deleted": boolean,"numero": number,"updated_at": string,"valor": number
                  }
                  ComputedFields: never
                  Insert: {
                    "competencia": string,"compra_id": string,"created_at"?: string,"created_by"?: string,"id"?: string,"is_deleted"?: boolean,"numero": number,"updated_at"?: string,"valor": number
                  }
                  Update: {
                    "competencia"?: string,"compra_id"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"is_deleted"?: boolean,"numero"?: number,"updated_at"?: string,"valor"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "parcelas_compra_id_created_by_fkey"
      columns: ["compra_id","created_by"]
isOneToOne: false
      referencedRelation: "compras"
      referencedColumns: ["id","created_by"]
    }
                  ]
                },"parcelas_divida": {
                  Row: {
                    "amortizacao": number,"created_at": string,"created_by": string,"divida_id": string,"id": string,"is_deleted": boolean,"juros": number,"numero": number,"paga_antes_do_cadastro": boolean,"updated_at": string,"valor": number,"vencimento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amortizacao": number,"created_at"?: string,"created_by"?: string,"divida_id": string,"id"?: string,"is_deleted"?: boolean,"juros": number,"numero": number,"paga_antes_do_cadastro"?: boolean,"updated_at"?: string,"valor": number,"vencimento": string
                  }
                  Update: {
                    "amortizacao"?: number,"created_at"?: string,"created_by"?: string,"divida_id"?: string,"id"?: string,"is_deleted"?: boolean,"juros"?: number,"numero"?: number,"paga_antes_do_cadastro"?: boolean,"updated_at"?: string,"valor"?: number,"vencimento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parcelas_divida_divida_id_created_by_fkey"
      columns: ["divida_id","created_by"]
isOneToOne: false
      referencedRelation: "dividas"
      referencedColumns: ["id","created_by"]
    }
                  ]
                },"preferencias": {
                  Row: {
                    "created_at": string,"created_by": string,"horizonte_padrao": number,"id": string,"is_deleted": boolean,"limite_alerta": number,"ocultar_valores_ao_abrir": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string,"horizonte_padrao"?: number,"id"?: string,"is_deleted"?: boolean,"limite_alerta"?: number,"ocultar_valores_ao_abrir"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"horizonte_padrao"?: number,"id"?: string,"is_deleted"?: boolean,"limite_alerta"?: number,"ocultar_valores_ao_abrir"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"recorrencia_versoes": {
                  Row: {
                    "cartao_id": string | null,"categoria_id": string,"conta_id": string | null,"created_at": string,"created_by": string,"dia": number,"forma_pagamento": string,"id": string,"is_deleted": boolean,"recorrencia_id": string,"updated_at": string,"valor": number,"vigente_desde": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cartao_id"?: string | null,"categoria_id": string,"conta_id"?: string | null,"created_at"?: string,"created_by"?: string,"dia": number,"forma_pagamento"?: string,"id"?: string,"is_deleted"?: boolean,"recorrencia_id": string,"updated_at"?: string,"valor": number,"vigente_desde": string
                  }
                  Update: {
                    "cartao_id"?: string | null,"categoria_id"?: string,"conta_id"?: string | null,"created_at"?: string,"created_by"?: string,"dia"?: number,"forma_pagamento"?: string,"id"?: string,"is_deleted"?: boolean,"recorrencia_id"?: string,"updated_at"?: string,"valor"?: number,"vigente_desde"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recorrencia_versoes_cartao_id_created_by_fkey"
      columns: ["cartao_id","created_by"]
isOneToOne: false
      referencedRelation: "cartoes"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "recorrencia_versoes_categoria_id_created_by_fkey"
      columns: ["categoria_id","created_by"]
isOneToOne: false
      referencedRelation: "categorias"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "recorrencia_versoes_conta_id_created_by_fkey"
      columns: ["conta_id","created_by"]
isOneToOne: false
      referencedRelation: "contas"
      referencedColumns: ["id","created_by"]
    },{
      foreignKeyName: "recorrencia_versoes_recorrencia_id_created_by_fkey"
      columns: ["recorrencia_id","created_by"]
isOneToOne: false
      referencedRelation: "recorrencias"
      referencedColumns: ["id","created_by"]
    }
                  ]
                },"recorrencias": {
                  Row: {
                    "ativa": boolean,"auto_confirmar": boolean,"competencia_fim": string | null,"competencia_inicio": string,"created_at": string,"created_by": string,"descricao": string,"id": string,"is_deleted": boolean,"natureza": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativa"?: boolean,"auto_confirmar"?: boolean,"competencia_fim"?: string | null,"competencia_inicio": string,"created_at"?: string,"created_by"?: string,"descricao": string,"id"?: string,"is_deleted"?: boolean,"natureza": string,"updated_at"?: string
                  }
                  Update: {
                    "ativa"?: boolean,"auto_confirmar"?: boolean,"competencia_fim"?: string | null,"competencia_inicio"?: string,"created_at"?: string,"created_by"?: string,"descricao"?: string,"id"?: string,"is_deleted"?: boolean,"natureza"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "gravar":
{ Args: { "ops": Json }; Returns: Json
                           },
"inicializar_usuario":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"tabelas_de_negocio":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
