import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Bot, 
  LogOut, 
  Save, 
  Plus, 
  Trash2, 
  Edit2,
  TrendingUp,
  Users,
  Settings,
  LayoutGrid,
  CreditCard
} from 'lucide-react';
import { MenuItem, Category } from '../types';

interface AdminDashboardProps {
  menuItems: MenuItem[];
  onUpdateMenu: (items: MenuItem[]) => void;
  systemInstruction: string;
  onUpdateInstruction: (instruction: string) => void;
  whatsappNumber: string;
  onUpdateWhatsapp: (number: string) => void;
  menuLayout: 'standard' | 'minimal';
  onUpdateMenuLayout: (layout: 'standard' | 'minimal') => void;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  menuItems, 
  onUpdateMenu, 
  systemInstruction, 
  onUpdateInstruction,
  whatsappNumber,
  onUpdateWhatsapp,
  menuLayout,
  onUpdateMenuLayout,
  onLogout 
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'ai' | 'settings'>('dashboard');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [instructionDraft, setInstructionDraft] = useState(systemInstruction);
  const [whatsappDraft, setWhatsappDraft] = useState(whatsappNumber);

  // Stats calculation
  const totalItems = menuItems.length;
  
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    // Check if it's a new item or update
    const exists = menuItems.find(i => i.id === editingItem.id);
    if (exists) {
      onUpdateMenu(menuItems.map(i => i.id === editingItem.id ? editingItem : i));
    } else {
      onUpdateMenu([...menuItems, editingItem]);
    }
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      onUpdateMenu(menuItems.filter(i => i.id !== id));
    }
  };

  const createNewItem = () => {
    setEditingItem({
      id: Date.now().toString(),
      name: '',
      description: '',
      price: 0,
      category: Category.ESPETINHOS,
      image: 'https://picsum.photos/400/300',
      popular: false
    });
  };

  const handleSaveAI = () => {
    onUpdateInstruction(instructionDraft);
    alert('Configurações da IA salvas com sucesso!');
  };

  const handleSaveSettings = () => {
    onUpdateWhatsapp(whatsappDraft);
    alert('Configurações da loja salvas com sucesso!');
  };

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-2xl font-display font-bold text-orange-500">KAL <span className="text-white">ADMIN</span></h2>
          <p className="text-xs text-neutral-500 mt-1">Painel de Gerenciamento</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('menu')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'menu' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          >
            <UtensilsCrossed size={20} /> Cardápio
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'ai' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          >
            <Bot size={20} /> Agente IA
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
          >
            <Settings size={20} /> Configurações
          </button>
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={18} /> Sair / Voltar à Loja
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black p-8">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            <h1 className="text-3xl font-bold font-display text-white">Visão Geral</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-neon-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-orange-500/20 rounded-lg text-orange-500">
                    <TrendingUp size={24} />
                  </div>
                  <span className="text-xs font-bold text-green-500">+12% hoje</span>
                </div>
                <h3 className="text-neutral-400 text-sm font-medium">Vendas (Simulado)</h3>
                <p className="text-3xl font-bold text-white mt-1">R$ 1.240,00</p>
              </div>

              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-neon-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg text-blue-500">
                    <UtensilsCrossed size={24} />
                  </div>
                </div>
                <h3 className="text-neutral-400 text-sm font-medium">Itens no Menu</h3>
                <p className="text-3xl font-bold text-white mt-1">{totalItems}</p>
              </div>

              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-neon-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg text-purple-500">
                    <Users size={24} />
                  </div>
                </div>
                <h3 className="text-neutral-400 text-sm font-medium">Visitas (Simulado)</h3>
                <p className="text-3xl font-bold text-white mt-1">84</p>
              </div>
            </div>

            <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Acesso Rápido</h3>
              <div className="flex gap-4">
                <button onClick={() => setActiveTab('menu')} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Editar Cardápio
                </button>
                <button onClick={() => setActiveTab('settings')} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Configurar Loja
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MENU TAB */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold font-display text-white">Gerenciar Cardápio</h1>
              <button 
                onClick={createNewItem}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-neon transition-colors"
              >
                <Plus size={20} /> Novo Item
              </button>
            </div>

            {editingItem ? (
              <div className="bg-neutral-900 p-6 rounded-xl border border-orange-500/30 shadow-neon">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">
                    {editingItem.id && menuItems.find(i => i.id === editingItem.id) ? 'Editar Item' : 'Novo Item'}
                  </h3>
                  <button onClick={() => setEditingItem(null)} className="text-neutral-400 hover:text-white"><LogOut size={20} className="rotate-180" /></button>
                </div>
                
                <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Nome do Prato</label>
                    <input 
                      required
                      type="text" 
                      value={editingItem.name} 
                      onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Preço (R$)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      value={editingItem.price} 
                      onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Categoria</label>
                    <select 
                      value={editingItem.category} 
                      onChange={e => setEditingItem({...editingItem, category: e.target.value as Category})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none"
                    >
                      {Object.values(Category).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">URL da Imagem</label>
                    <input 
                      type="text" 
                      value={editingItem.image} 
                      onChange={e => setEditingItem({...editingItem, image: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-sm text-neutral-400">Descrição</label>
                    <textarea 
                      required
                      value={editingItem.description} 
                      onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none h-24 resize-none"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2 flex items-center gap-2">
                     <input 
                        type="checkbox" 
                        id="isPopular"
                        checked={editingItem.popular || false}
                        onChange={e => setEditingItem({...editingItem, popular: e.target.checked})}
                        className="w-5 h-5 accent-orange-500"
                     />
                     <label htmlFor="isPopular" className="text-white">Marcar como Popular</label>
                  </div>

                  <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-neutral-400 hover:text-white">Cancelar</button>
                    <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold shadow-neon">Salvar Item</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-neutral-950 text-neutral-400 text-sm uppercase">
                    <tr>
                      <th className="p-4">Item</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Preço</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {menuItems.map(item => (
                      <tr key={item.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <img src={item.image} alt="" className="w-10 h-10 rounded object-cover bg-neutral-800" />
                          <div>
                            <div className="font-bold text-white">{item.name}</div>
                            <div className="text-xs text-neutral-500 truncate max-w-[200px]">{item.description}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-neutral-800 text-neutral-300 px-2 py-1 rounded text-xs border border-neutral-700">
                            {item.category.split(' ')[0]}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-orange-400">R$ {item.price.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingItem(item)}
                              className="p-2 text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-2 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AI CONFIG TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <h1 className="text-3xl font-bold font-display text-white">Configuração do Agente IA</h1>
            <p className="text-neutral-400">Personalize como o "Garçom Virtual" se comporta e interage com os clientes.</p>

            <div className="grid grid-cols-1 gap-8">
              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-neon-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                   <div className="p-2 bg-orange-600 rounded-lg">
                      <Bot size={24} className="text-white" />
                   </div>
                   <div>
                     <h3 className="font-bold text-lg text-white">Personalidade e Instruções</h3>
                     <p className="text-xs text-neutral-500">Defina o tom de voz e as regras do assistente.</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-neutral-300">
                    Instrução do Sistema (System Prompt)
                  </label>
                  <div className="text-xs text-neutral-500 bg-neutral-950 p-3 rounded border border-neutral-800 mb-2">
                     ℹ️ O cardápio atual é injetado automaticamente no final deste prompt. Não precisa listá-lo aqui.
                  </div>
                  <textarea 
                    value={instructionDraft}
                    onChange={(e) => setInstructionDraft(e.target.value)}
                    className="w-full h-96 bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-neutral-200 font-mono text-sm leading-relaxed focus:border-orange-500 focus:outline-none resize-none"
                  />
                  
                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={handleSaveAI}
                      className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold shadow-neon transition-all hover:scale-105"
                    >
                      <Save size={20} /> Salvar Configurações
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <h1 className="text-3xl font-bold font-display text-white">Configurações da Loja</h1>
            
            {/* Visual Settings */}
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-neon-sm">
               <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                   <div className="p-2 bg-purple-600 rounded-lg">
                      <LayoutGrid size={24} className="text-white" />
                   </div>
                   <div>
                     <h3 className="font-bold text-lg text-white">Visual do Cardápio</h3>
                     <p className="text-xs text-neutral-500">Escolha como os itens são exibidos para o cliente.</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => onUpdateMenuLayout('standard')}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${menuLayout === 'standard' ? 'border-orange-500 bg-neutral-800' : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'}`}
                  >
                    <div className="w-full h-20 bg-neutral-800 rounded border border-neutral-700 flex flex-col gap-1 p-2">
                      <div className="w-full h-10 bg-neutral-700 rounded"></div>
                      <div className="w-2/3 h-2 bg-neutral-600 rounded"></div>
                      <div className="w-full h-4 bg-neutral-600 rounded mt-auto"></div>
                    </div>
                    <span className={`font-bold text-sm ${menuLayout === 'standard' ? 'text-orange-500' : 'text-neutral-400'}`}>Padrão (Largo)</span>
                  </div>

                  <div 
                    onClick={() => onUpdateMenuLayout('minimal')}
                    className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${menuLayout === 'minimal' ? 'border-orange-500 bg-neutral-800' : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'}`}
                  >
                     <div className="w-full h-20 bg-neutral-800 rounded border border-neutral-700 p-0 overflow-hidden relative">
                      <div className="w-full h-12 bg-neutral-700"></div>
                      <div className="absolute bottom-1 right-1 w-4 h-4 bg-red-500 rounded-full"></div>
                    </div>
                    <span className={`font-bold text-sm ${menuLayout === 'minimal' ? 'text-orange-500' : 'text-neutral-400'}`}>Minimalista (Print)</span>
                  </div>
                </div>
            </div>

            {/* Contact Settings */}
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-neon-sm">
               <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
                   <div className="p-2 bg-green-600 rounded-lg">
                      <Settings size={24} className="text-white" />
                   </div>
                   <div>
                     <h3 className="font-bold text-lg text-white">Dados de Contato</h3>
                     <p className="text-xs text-neutral-500">Para onde os pedidos são enviados.</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Número do WhatsApp
                    </label>
                    <input 
                      type="text" 
                      value={whatsappDraft}
                      onChange={(e) => setWhatsappDraft(e.target.value)}
                      placeholder="5511999999999"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none font-mono"
                    />
                    <p className="text-xs text-neutral-500 mt-2">
                      Formato internacional: 55 + DDD + Número (apenas números). Ex: 5511999999999
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={handleSaveSettings}
                      className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold shadow-neon transition-all hover:scale-105"
                    >
                      <Save size={20} /> Salvar Alterações
                    </button>
                  </div>
                </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;