import React, { useState, useRef } from 'react';
import { 
  LayoutDashboard, UtensilsCrossed, Bot, LogOut, Save, Plus, Trash2, Edit2,
  TrendingUp, Settings, Star, Camera, Image as ImageIcon, Clock, MapPin, 
  CheckCircle, ChefHat, XCircle, ShoppingBag, ArrowRight, MessageSquare
} from 'lucide-react';
import { MenuItem, Category, Order, OrderStatus, AppSettings } from '../types';

interface AdminDashboardProps {
  menuItems: MenuItem[];
  onUpdateMenu: (items: MenuItem[]) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  orders: Order[];
  onUpdateOrder: (order: Order) => void;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  menuItems, onUpdateMenu, settings, onUpdateSettings, orders, onUpdateOrder, onLogout 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'menu' | 'ai' | 'settings'>('dashboard');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Settings Local State
  const [localSettings, setLocalSettings] = useState(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
     e.preventDefault();
     if (loginForm.user === 'admin' && loginForm.pass === 'kal123') {
        setIsAuthenticated(true);
     } else {
        alert("Credenciais inválidas. Tente admin / kal123");
     }
  };

  // --- CRUD MENU ---
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const exists = menuItems.find(i => i.id === editingItem.id);
    if (exists) onUpdateMenu(menuItems.map(i => i.id === editingItem.id ? editingItem : i));
    else onUpdateMenu([...menuItems, editingItem]);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Excluir item?')) onUpdateMenu(menuItems.filter(i => i.id !== id));
  };

  const createNewItem = () => {
    setEditingItem({
      id: Date.now().toString(),
      name: '', description: '', price: 0, category: Category.ESPETINHOS,
      image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80', popular: false
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingItem) {
      const reader = new FileReader();
      reader.onloadend = () => setEditingItem({ ...editingItem, image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  // --- KANBAN ---
  const updateStatus = (order: Order, newStatus: OrderStatus) => {
    onUpdateOrder({ ...order, status: newStatus });
  };

  // --- SETTINGS ---
  const saveSettings = () => {
     onUpdateSettings(localSettings);
     alert("Configurações salvas!");
  };

  if (!isAuthenticated) {
     return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
           <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 p-8 rounded-xl shadow-neon">
              <div className="text-center mb-8">
                 <h1 className="text-3xl font-display font-bold text-white">KAL <span className="text-orange-500">ADMIN</span></h1>
                 <p className="text-neutral-500">Acesso Restrito</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                 <input type="text" placeholder="Usuário" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-white focus:border-orange-500 focus:outline-none" value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})} />
                 <input type="password" placeholder="Senha" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-white focus:border-orange-500 focus:outline-none" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
                 <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded shadow-neon transition-colors">Entrar</button>
              </form>
              <button onClick={onLogout} className="w-full text-center text-neutral-500 text-sm mt-4 hover:text-white">Voltar à Loja</button>
           </div>
        </div>
     );
  }

  // Filter Orders for Kanban
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-2xl font-display font-bold text-orange-500">KAL <span className="text-white">ADMIN</span></h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800'}`}><LayoutDashboard size={20} /> Pedidos</button>
          <button onClick={() => setActiveTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'menu' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800'}`}><UtensilsCrossed size={20} /> Cardápio</button>
          <button onClick={() => setActiveTab('ai')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'ai' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800'}`}><Bot size={20} /> Agente IA</button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800'}`}><Settings size={20} /> Configurações</button>
        </nav>
        <div className="p-4 border-t border-neutral-800"><button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg"><LogOut size={18} /> Sair</button></div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 w-full bg-neutral-900 border-t border-neutral-800 z-50 flex justify-around p-2">
         <button onClick={() => setActiveTab('dashboard')} className={`p-2 rounded-lg ${activeTab === 'dashboard' ? 'text-orange-500' : 'text-neutral-400'}`}><LayoutDashboard size={24} /></button>
         <button onClick={() => setActiveTab('menu')} className={`p-2 rounded-lg ${activeTab === 'menu' ? 'text-orange-500' : 'text-neutral-400'}`}><UtensilsCrossed size={24} /></button>
         <button onClick={() => setActiveTab('ai')} className={`p-2 rounded-lg ${activeTab === 'ai' ? 'text-orange-500' : 'text-neutral-400'}`}><Bot size={24} /></button>
         <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg ${activeTab === 'settings' ? 'text-orange-500' : 'text-neutral-400'}`}><Settings size={24} /></button>
         <button onClick={onLogout} className="p-2 text-red-500"><LogOut size={24} /></button>
      </div>

      <main className="flex-1 overflow-y-auto bg-black p-4 md:p-8 pb-24 md:pb-8">
        {/* DASHBOARD (KANBAN) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 h-full flex flex-col">
            <h1 className="text-3xl font-bold font-display text-white">Gestão de Pedidos</h1>
            <div className="flex-1 overflow-x-auto">
               <div className="flex gap-6 min-w-[1000px] h-full">
                  
                  {/* PENDING */}
                  <div className="flex-1 bg-neutral-900/50 rounded-xl border border-neutral-800 p-4 flex flex-col gap-4">
                     <div className="flex justify-between items-center text-yellow-500 font-bold border-b border-neutral-800 pb-2">
                        <span>Recebidos ({pendingOrders.length})</span>
                        <Clock size={18} />
                     </div>
                     {pendingOrders.map(o => (
                        <div key={o.id} className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 shadow-sm relative">
                           <div className="flex justify-between mb-2">
                              <span className="font-bold text-white">{o.id}</span>
                              <span className="text-xs text-neutral-400">{new Date(o.createdAt).toLocaleTimeString()}</span>
                           </div>
                           <p className="text-sm text-neutral-300 font-bold mb-1">{o.customer.customerName}</p>
                           <p className="text-xs text-neutral-400 mb-2 capitalize">{o.customer.deliveryMethod} {o.customer.deliveryMethod === 'table' ? `- Mesa ${o.customer.tableNumber}` : ''}</p>
                           <div className="text-xs text-neutral-500 border-t border-neutral-700 pt-2 mt-2">
                              {o.items.map(i => <div key={i.id}>{i.quantity}x {i.name}</div>)}
                           </div>
                           {o.customer.observations && (
                              <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-xs text-yellow-200">
                                 <div className="flex items-center gap-1 font-bold mb-1"><MessageSquare size={10}/> Obs:</div>
                                 {o.customer.observations}
                              </div>
                           )}
                           {o.deliveryFee && (
                              <div className="text-xs text-orange-400 mt-1 font-bold">
                                 + Entrega: R$ {o.deliveryFee.toFixed(2)}
                              </div>
                           )}
                           <button onClick={() => updateStatus(o, 'preparing')} className="w-full mt-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1">
                              Aceitar e Preparar <ArrowRight size={14} />
                           </button>
                        </div>
                     ))}
                  </div>

                  {/* PREPARING */}
                  <div className="flex-1 bg-neutral-900/50 rounded-xl border border-neutral-800 p-4 flex flex-col gap-4">
                     <div className="flex justify-between items-center text-orange-500 font-bold border-b border-neutral-800 pb-2">
                        <span>Na Cozinha ({preparingOrders.length})</span>
                        <ChefHat size={18} />
                     </div>
                     {preparingOrders.map(o => (
                        <div key={o.id} className="bg-neutral-800 p-4 rounded-lg border border-orange-500/30 shadow-sm">
                           <div className="flex justify-between mb-2">
                              <span className="font-bold text-white">{o.id}</span>
                              <span className="text-xs text-neutral-400">{new Date(o.createdAt).toLocaleTimeString()}</span>
                           </div>
                           <p className="text-sm text-neutral-300 font-bold mb-1">{o.customer.customerName}</p>
                           <p className="text-xs text-neutral-400 mb-2 capitalize">{o.customer.deliveryMethod} {o.customer.deliveryMethod === 'table' ? `- Mesa ${o.customer.tableNumber}` : ''}</p>
                           {o.customer.observations && (
                              <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-xs text-yellow-200">
                                 <div className="flex items-center gap-1 font-bold mb-1"><MessageSquare size={10}/> Obs:</div>
                                 {o.customer.observations}
                              </div>
                           )}
                           <button onClick={() => updateStatus(o, 'ready')} className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1">
                              Marcar como Pronto <CheckCircle size={14} />
                           </button>
                        </div>
                     ))}
                  </div>

                  {/* READY */}
                  <div className="flex-1 bg-neutral-900/50 rounded-xl border border-neutral-800 p-4 flex flex-col gap-4">
                     <div className="flex justify-between items-center text-green-500 font-bold border-b border-neutral-800 pb-2">
                        <span>Pronto / Entrega ({readyOrders.length})</span>
                        <CheckCircle size={18} />
                     </div>
                     {readyOrders.map(o => (
                        <div key={o.id} className="bg-neutral-800 p-4 rounded-lg border border-green-500/30 shadow-sm">
                           <div className="flex justify-between mb-2">
                              <span className="font-bold text-white">{o.id}</span>
                              <span className="text-xs text-neutral-400">{new Date(o.createdAt).toLocaleTimeString()}</span>
                           </div>
                           <p className="text-sm text-neutral-300 font-bold mb-1">{o.customer.customerName}</p>
                           <p className="text-xs text-neutral-400 mb-2 capitalize">{o.customer.deliveryMethod}</p>
                           {o.customer.observations && (
                              <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-xs text-yellow-200">
                                 <div className="flex items-center gap-1 font-bold mb-1"><MessageSquare size={10}/> Obs:</div>
                                 {o.customer.observations}
                              </div>
                           )}
                           <button onClick={() => updateStatus(o, 'finished')} className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-1">
                              Finalizar Pedido <MapPin size={14} />
                           </button>
                        </div>
                     ))}
                  </div>

               </div>
            </div>
          </div>
        )}

        {/* MENU EDITOR */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between">
                <h2 className="text-3xl font-bold">Cardápio</h2>
                <button onClick={createNewItem} className="bg-orange-600 px-4 py-2 rounded text-white font-bold flex items-center gap-2"><Plus size={20}/> Novo</button>
             </div>
             {editingItem ? (
                <form onSubmit={handleSaveItem} className="bg-neutral-900 p-6 rounded-xl border border-orange-500/30 grid grid-cols-2 gap-4">
                   <div className="col-span-2 flex justify-between"><h3 className="font-bold">Editar Item</h3><button type="button" onClick={() => setEditingItem(null)}><LogOut className="rotate-180"/></button></div>
                   <input required value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} placeholder="Nome" className="bg-neutral-950 border border-neutral-800 p-3 rounded text-white"/>
                   <input required type="number" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)})} placeholder="Preço" className="bg-neutral-950 border border-neutral-800 p-3 rounded text-white"/>
                   <select value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value as Category})} className="bg-neutral-950 border border-neutral-800 p-3 rounded text-white">{Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}</select>
                   <div className="flex gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-neutral-800 p-3 rounded text-white flex-1"><Camera/></button>
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*"/>
                      <input value={editingItem.image} onChange={e => setEditingItem({...editingItem, image: e.target.value})} placeholder="URL Imagem" className="bg-neutral-950 border border-neutral-800 p-3 rounded text-white flex-[3] text-xs"/>
                   </div>
                   <textarea value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} placeholder="Descrição" className="col-span-2 bg-neutral-950 border border-neutral-800 p-3 rounded text-white h-24"/>
                   <div className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={editingItem.popular} onChange={e => setEditingItem({...editingItem, popular: e.target.checked})} className="accent-orange-500"/> <label>Popular?</label></div>
                   <button type="submit" className="col-span-2 bg-orange-600 py-3 rounded text-white font-bold">Salvar</button>
                </form>
             ) : (
                <div className="grid gap-4">
                   {menuItems.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-neutral-900 p-4 rounded border border-neutral-800">
                         <div className="flex items-center gap-3"><img src={item.image} className="w-10 h-10 rounded object-cover"/> <span>{item.name}</span></div>
                         <div className="flex gap-2"><button onClick={() => setEditingItem(item)} className="p-2 text-blue-400"><Edit2/></button><button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-400"><Trash2/></button></div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        )}

        {/* AI & SETTINGS (Combined simplified for space) */}
        {(activeTab === 'ai' || activeTab === 'settings') && (
           <div className="space-y-6 animate-fade-in max-w-2xl">
              <h1 className="text-3xl font-bold">{activeTab === 'ai' ? 'IA' : 'Configurações'}</h1>
              <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-4">
                 {activeTab === 'ai' ? (
                    <textarea value={localSettings.systemInstruction} onChange={e => setLocalSettings({...localSettings, systemInstruction: e.target.value})} className="w-full h-64 bg-neutral-950 p-4 rounded text-white" />
                 ) : (
                    <>
                       <div><label className="text-sm text-neutral-400">WhatsApp Loja</label><input value={localSettings.whatsappNumber} onChange={e => setLocalSettings({...localSettings, whatsappNumber: e.target.value})} className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800"/></div>
                       <div><label className="text-sm text-neutral-400">Chave PIX</label><input value={localSettings.pixKey} onChange={e => setLocalSettings({...localSettings, pixKey: e.target.value})} className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800"/></div>
                       
                       {/* Layout Selector Restored */}
                       <div><label className="text-sm text-neutral-400">Layout do Cardápio</label>
                          <div className="grid grid-cols-2 gap-4 mt-1">
                             <button onClick={() => setLocalSettings({...localSettings, menuLayout: 'standard'})} className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-2 transition-all ${localSettings.menuLayout === 'standard' ? 'bg-orange-600 border-orange-600 text-white shadow-neon' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
                                <div className="w-8 h-10 bg-neutral-800 rounded border border-neutral-600" />
                                Padrão (Grande)
                             </button>
                             <button onClick={() => setLocalSettings({...localSettings, menuLayout: 'minimal'})} className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-2 transition-all ${localSettings.menuLayout === 'minimal' ? 'bg-orange-600 border-orange-600 text-white shadow-neon' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
                                <div className="w-8 h-8 bg-neutral-800 rounded border border-neutral-600" />
                                Minimalista (Pequeno)
                             </button>
                          </div>
                       </div>

                       <div><label className="text-sm text-neutral-400">Taxa de Entrega (R$)</label><input type="number" step="0.50" value={localSettings.deliveryFee} onChange={e => setLocalSettings({...localSettings, deliveryFee: parseFloat(e.target.value)})} className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800"/></div>
                       <div><label className="text-sm text-orange-400">Webhook n8n (Integração)</label><input value={localSettings.n8nWebhookUrl} onChange={e => setLocalSettings({...localSettings, n8nWebhookUrl: e.target.value})} placeholder="https://seu-n8n.com/webhook/..." className="w-full bg-neutral-950 p-3 rounded text-white border border-orange-500/30"/></div>
                    </>
                 )}
                 <button onClick={saveSettings} className="bg-orange-600 px-6 py-3 rounded text-white font-bold w-full">Salvar Tudo</button>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;