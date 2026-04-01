import { createClient } from '@/utils/supabase/client'

export async function checkComprovanteConfig() {
    const supabase = createClient()
    const { data } = await supabase.from('configuracoes').select('comprovante_logo_url, comprovante_mensagem, nome_restaurante, logo_url').single()
    return data
}
