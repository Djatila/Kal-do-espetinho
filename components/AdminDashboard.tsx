import React, { useState, useRef } from 'react';
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
  Settings,
  LayoutGrid,
  Star,
  Camera,
  Upload,
  Image as ImageIcon
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats calculation
  const totalItems = menuItems.length;
  const totalPopular = menuItems.filter(i => i.popular).length;
  
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

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
      image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=400&h=300&auto=format&fit=crop',
      popular: false
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingItem) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingItem({
          ...editingItem,
          image: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
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
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-2xl font-display font-bold text-orange-500">KAL <span className="text-white">ADMIN</span></h2>
          <p className="text-xs text-neutral-500 mt-1">Painel de Gerenciamento</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'menu' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <UtensilsCrossed size={20} /> Cardápio
          </button>
          <button onClick={() => setActiveTab('ai')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'ai' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <Bot size={20} /> Agente IA
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <Settings size={20} /> Configurações
          </button>
        </nav>

        <div className="p-4 border-t border-neutral-800">
          <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
            <LogOut size={18} /> Sair / Voltar à Loja
          </button>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 w-full bg-neutral-900 border-t border-neutral-800 z-50 flex justify-around p-2">
         <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-orange-500' : 'text-neutral-400'}`}><LayoutDashboard size={24} /></button>
         <button onClick={() => setActiveTab('menu')} className={`p-2 rounded-lg ${activeTab === 'menu' ? 'text-orange-500' : 'text-neutral-400'}`}><UtensilsCrossed size={24} /></button>
         <button onClick={() => setActiveTab('ai')} className={`p-2 rounded-lg ${activeTab === 'ai' ? 'text-orange-500' : 'text-neutral-400'}`}><Bot size={24} /></button>
         <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg ${activeTab === 'settings' ? 'text-orange-500' : 'text-neutral-400'}`}><Settings size={24} /></button>
         <button onClick={onLogout} className="p-2 text-red-500"><LogOut size={24} /></button>
      </div>

      <main className="flex-1 overflow-y-auto bg-black p-4 md:p-8 pb-24 md:pb-8">
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Visão Geral</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-neon-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-orange-500/20 rounded-lg text-orange-500"><TrendingUp size={24} /></div>
                  <span className="text-xs font-bold text-green-500">+12% hoje</span>
                </div>
                <h3 className="text-neutral-400 text-sm font-medium">Vendas (Simulado)</h3>
                <p className="text-3xl font-bold text-white mt-1">R$ 1.240,00</p>
              </div>
              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-neon-sm">
                <div className="flex justify-between items-start mb-4"><div className="p-3 bg-blue-500/20 rounded-lg text-blue-500"><Star size={24} /></div></div>
                <h3 className="text-neutral-400 text-sm font-medium">Itens em Destaque</h3>
                <p className="text-3xl font-bold text-white mt-1">{totalPopular}</p>
              </div>
              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 shadow-neon-sm">
                <div className="flex justify-between items-start mb-4"><div className="p-3 bg-purple-500/20 rounded-lg text-purple-500"><UtensilsCrossed size={24} /></div></div>
                <h3 className="text-neutral-400 text-sm font-medium">Total de Itens</h3>
                <p className="text-3xl font-bold text-white mt-1">{totalItems}</p>
              </div>
            </div>
          </div>
        )}

        {/* MENU */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Gerenciar Cardápio</h1>
                <p className="text-sm text-neutral-500">Adicione ou edite os itens da sua casa.</p>
              </div>
              <button onClick={createNewItem} className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold shadow-neon transition-colors">
                <Plus size={20} /> Novo Item
              </button>
            </div>

            {editingItem ? (
              <div className="bg-neutral-900 p-6 rounded-xl border border-orange-500/30 shadow-neon">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">{editingItem.id && menuItems.find(i => i.id === editingItem.id) ? 'Editar Item' : 'Novo Item'}</h3>
                  <button onClick={() => setEditingItem(null)} className="text-neutral-400 hover:text-white"><LogOut size={20} className="rotate-180" /></button>
                </div>
                
                <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Nome do Prato</label>
                    <input required type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Preço (R$)</label>
                    <input required type="number" step="0.01" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Categoria</label>
                    <select value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value as Category})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none">
                      {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  {/* Campo de Imagem Modernizado */}
                  <div className="space-y-2">
                    <label className="text-sm text-neutral-400">Imagem do Prato</label>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white p-3 rounded-lg transition-colors font-bold text-sm"
                        >
                          <Camera size={18} className="text-orange-500" />
                          Escolher do Dispositivo
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          accept="image/*" 
                          className="hidden" 
                        />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="relative group shrink-0">
                          <img 
                            src={editingItem.image} 
                            alt="Preview" 
                            className="w-16 h-16 rounded-lg object-cover border border-neutral-700"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ImageIcon size={14} />
                          </div>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Ou cole o link da imagem aqui..."
                          value={editingItem.image.startsWith('data:') ? 'Imagem carregada do dispositivo' : editingItem.image} 
                          onChange={e => setEditingItem({...editingItem, image: e.target.value})}
                          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white text-xs focus:border-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-sm text-neutral-400">Descrição</label>
                    <textarea required value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none h-24 resize-none" />
                  </div>

                  <div className="col-span-1 md:col-span-2 bg-neutral-950 p-4 rounded-lg border border-neutral-800 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${editingItem.popular ? 'bg-orange-600 text-white' : 'bg-neutral-800 text-neutral-500'}`}><Star size={20} fill={editingItem.popular ? "currentColor" : "none"} /></div>
                        <div>
                           <label htmlFor="isPopular" className="text-white font-bold cursor-pointer">Aparecer nos Destaques (Topo)</label>
                           <p className="text-xs text-neutral-500">Exibir em círculo no topo do cardápio.</p>
                        </div>
                     </div>
                     <input type="checkbox" id="isPopular" checked={editingItem.popular || false} onChange={e => setEditingItem({...editingItem, popular: e.target.checked})} className="w-6 h-6 accent-orange-500 cursor-pointer" />
                  </div>

                  <div className="col-span-1 md:col-span-2 flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-neutral-400 hover:text-white">Cancelar</button>
                    <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold shadow-neon">Salvar Item</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-neutral-950 text-neutral-400 text-sm uppercase">
                    <tr><th className="p-4">Item</th><th className="p-4">Categoria</th><th className="p-4">Preço</th><th className="p-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {menuItems.map(item => (
                      <tr key={item.id} className="hover:bg-neutral-800/50 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <div className="relative">
                            <img src={item.image} alt="" className="w-10 h-10 rounded object-cover bg-neutral-800" />
                            {item.popular && <div className="absolute -top-1 -right-1 bg-orange-600 rounded-full p-0.5"><Star size={8} fill="white" /></div>}
                          </div>
                          <div className="font-bold text-white">{item.name}</div>
                        </td>
                        <td className="p-4"><span className="bg-neutral-800 text-neutral-300 px-2 py-1 rounded text-xs border border-neutral-700">{item.category}</span></td>
                        <td className="p-4 font-mono text-orange-400">R$ {item.price.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingItem(item)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded"><Edit2 size={18} /></button>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded"><Trash2 size={18} /></button>
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

        {/* AI CONFIG */}
        {activeTab === 'ai' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Configuração do Agente IA</h1>
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
              <textarea value={instructionDraft} onChange={(e) => setInstructionDraft(e.target.value)} className="w-full h-96 bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-neutral-200 font-mono text-sm focus:border-orange-500 focus:outline-none resize-none" />
              <div className="flex justify-end pt-4"><button onClick={handleSaveAI} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold shadow-neon"><Save size={20} /> Salvar IA</button></div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Configurações</h1>
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
              <label className="block text-sm font-medium text-neutral-300 mb-2">WhatsApp de Pedidos</label>
              <input type="text" value={whatsappDraft} onChange={(e) => setWhatsappDraft(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none" />
              <div className="flex justify-end pt-4"><button onClick={handleSaveSettings} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-bold shadow-neon"><Save size={20} /> Salvar Alterações</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;