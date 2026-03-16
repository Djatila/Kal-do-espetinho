import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface DaySummary {
    data: string;
    entrada_total: number;
    saida_total: number;
    saldo_do_dia: number;
}

async function getFluxoCaixa() {
    const supabase = createClient()

    // Buscar dados dos últimos 30 dias
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setHours(0, 0, 0, 0)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

    const [
        { data: vendas },
        { data: pedidos },
        { data: despesas }
    ] = await Promise.all([
        supabase.from('vendas').select('data, total, valor, quantidade').gte('data', thirtyDaysAgoIso),
        supabase.from('pedidos_online').select('created_at, total').gte('created_at', thirtyDaysAgoIso).in('status', ['entregue', 'confirmado', 'preparando', 'pronto']),
        supabase.from('despesas').select('data, valor').gte('data', thirtyDaysAgoIso)
    ])

    const summaries: { [key: string]: DaySummary } = {}

    const getDayKey = (dateStr: string) => {
        const d = new Date(dateStr)
        // Usar formato YYYY-MM-DD para garantir ordenação correta e chaves únicas
        return d.toISOString().split('T')[0]
    }

    // Processar Vendas Manuais
    vendas?.forEach(v => {
        const key = getDayKey(v.data)
        if (!summaries[key]) summaries[key] = { data: key, entrada_total: 0, saida_total: 0, saldo_do_dia: 0 }
        const valor = Number(v.total || (v.quantidade * v.valor) || 0)
        summaries[key].entrada_total += valor
    })

    // Processar Pedidos Online
    pedidos?.forEach(p => {
        const key = getDayKey(p.created_at)
        if (!summaries[key]) summaries[key] = { data: key, entrada_total: 0, saida_total: 0, saldo_do_dia: 0 }
        summaries[key].entrada_total += Number(p.total || 0)
    })

    // Processar Despesas
    despesas?.forEach(d => {
        const key = getDayKey(d.data)
        if (!summaries[key]) summaries[key] = { data: key, entrada_total: 0, saida_total: 0, saldo_do_dia: 0 }
        summaries[key].saida_total += Number(d.valor || 0)
    })

    // Calcular saldos e ordenar
    return Object.values(summaries)
        .map(s => ({
            ...s,
            saldo_do_dia: s.entrada_total - s.saida_total
        }))
        .sort((a, b) => b.data.localeCompare(a.data))
}

export default async function FluxoCaixaPage() {
    const fluxo = await getFluxoCaixa()

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
                <p className="text-muted-foreground">Acompanhamento diário de entradas e saídas (Tempo Real)</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Movimentação Diária (Últimos 30 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th className="p-4 font-medium text-muted-foreground">Data</th>
                                    <th className="p-4 font-medium text-muted-foreground text-green-600">Entradas</th>
                                    <th className="p-4 font-medium text-muted-foreground text-red-600">Saídas</th>
                                    <th className="p-4 font-medium text-muted-foreground">Saldo do Dia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fluxo.map((item) => (
                                    <tr key={item.data} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td className="p-4">{new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="p-4 text-green-600">R$ {item.entrada_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-4 text-red-600">R$ {item.saida_total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="p-4 font-bold" style={{ color: item.saldo_do_dia >= 0 ? '#10b981' : '#ef4444' }}>
                                            R$ {item.saldo_do_dia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                {fluxo.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                            Nenhum registro de fluxo encontrado nos últimos 30 dias.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
