
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
   LayoutDashboard, UtensilsCrossed, Bot, LogOut, Save, Plus, Trash2, Edit2,
   TrendingUp, Settings, Star, Camera, Image as ImageIcon, Clock, MapPin,
   CheckCircle, ChefHat, XCircle, ShoppingBag, ArrowRight, MessageSquare, Megaphone,
   DollarSign, Activity, ClipboardList, Users, Check, Phone, CreditCard, Banknote, QrCode
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
   const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'menu' | 'ai' | 'settings' | 'promo'>('overview');
   const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

   // Toast State
   const [toast, setToast] = useState<{ show: boolean, message: string } | null>(null);

   // Settings Local State
   const [localSettings, setLocalSettings] = useState(settings);
   const fileInputRef = useRef<HTMLInputElement>(null);

   // Helper to show toast
   const showNotification = (message: string) => {
      setToast({ show: true, message });
      setTimeout(() => setToast(null), 3000);
   };

   // Login Handler
   const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (loginForm.user === 'admin' && loginForm.pass === 'kal123') {
         setIsAuthenticated(true);
      } else {
         alert("Credenciais inválidas. Tente admin / kal123");
      }
   };

   // --- STATS CALCULATION ---
   const stats = useMemo(() => {
      const activeOrders = orders.filter(o => o.status !== 'cancelado');
      const totalRevenue = activeOrders.reduce((acc, o) => acc + o.total, 0);
      const totalOrders = activeOrders.length;
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Top Items
      const itemCounts: Record<string, number> = {};
      activeOrders.forEach(o => {
         o.items.forEach(i => {
            itemCounts[i.name] = (itemCounts[i.name] || 0) + i.quantity;
         });
      });
      const topItems = Object.entries(itemCounts)
         .sort(([, a], [, b]) => b - a)
         .slice(0, 5)
         .map(([name, count]) => ({ name, count }));

      return { totalRevenue, totalOrders, averageTicket, topItems };
   }, [orders]);

   // --- CRUD MENU ---
   const handleSaveItem = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingItem) return;
      const exists = menuItems.find(i => i.id === editingItem.id);
      if (exists) onUpdateMenu(menuItems.map(i => i.id === editingItem.id ? editingItem : i));
      else onUpdateMenu([...menuItems, editingItem]);
      setEditingItem(null);
      showNotification("Item do cardápio salvo com sucesso!");
   };

   const handleDeleteItem = (id: string) => {
      if (confirm('Excluir item?')) {
         onUpdateMenu(menuItems.filter(i => i.id !== id));
         showNotification("Item excluído com sucesso!");
      }
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
      showNotification(`Pedido ${order.id} atualizado.`);
   };

   // --- SETTINGS ---
   const saveSettings = () => {
      onUpdateSettings(localSettings);
      showNotification("Configurações salvas com sucesso!");
   };

   // Component to render individual order card
   const OrderCard = ({ o, nextStatus, nextLabel, nextIcon }: { o: Order, nextStatus?: OrderStatus, nextLabel?: string, nextIcon?: React.ReactNode }) => {
      const paymentIcon = o.customer.paymentMethod === 'pix' ? <QrCode size={14} className="text-teal-500" /> :
         o.customer.paymentMethod === 'cash' ? <Banknote size={14} className="text-green-500" /> :
            <CreditCard size={14} className="text-blue-500" />;

      const paymentLabel = o.customer.paymentMethod === 'pix' ? 'PIX' :
         o.customer.paymentMethod === 'cash' ? 'Dinheiro' :
            'Cartão';

      return (
         <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 shadow-sm relative group hover:border-orange-500/50 transition-all duration-300">
            <div className="flex justify-between mb-2">
               <span className="font-bold text-white text-lg">{o.id}</span>
               <span className="text-xs text-neutral-500 font-mono">{new Date(o.createdAt).toLocaleTimeString()}</span>
            </div>

            <div className="space-y-1 mb-3">
               <p className="text-base text-white font-bold">{o.customer.customerName}</p>
               <a href={`https://wa.me/${o.customer.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-orange-500 transition-colors">
                  <Phone size={12} /> {o.customer.customerPhone}
               </a>
               <p className="text-xs text-orange-400 font-bold uppercase flex items-center gap-1.5">
                  {o.customer.deliveryMethod === 'table' ? <UtensilsCrossed size={12} /> : o.customer.deliveryMethod === 'delivery' ? <MapPin size={12} /> : <ShoppingBag size={12} />}
                  {o.customer.deliveryMethod === 'table' ? `Mesa ${o.customer.tableNumber}` :
                     o.customer.deliveryMethod === 'delivery' ? 'Delivery' : 'Retirada'}
               </p>

               {o.customer.deliveryMethod === 'delivery' && (
                  <div className="bg-black/20 p-2 rounded text-[10px] text-neutral-400 mt-1 border border-neutral-700/50">
                     {o.customer.address.street}, {o.customer.address.number} - {o.customer.address.neighborhood}
                     {o.customer.address.complement && ` (${o.customer.address.complement})`}
                  </div>
               )}
            </div>

            <div className="text-xs text-neutral-300 border-t border-neutral-700/50 pt-2 mb-3">
               {o.items.map(i => (
                  <div key={i.id} className="flex justify-between items-center py-0.5">
                     <span><span className="font-bold text-orange-500">{i.quantity}x</span> {i.name}</span>
                     <span className="text-neutral-500 font-mono">R$ {(i.price * i.quantity).toFixed(2)}</span>
                  </div>
               ))}
            </div>

            <div className="flex items-center justify-between py-2 border-t border-neutral-700/50 mb-3">
               <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-300">
                  {paymentIcon} {paymentLabel}
               </div>
               <div className="text-orange-500 font-bold text-base">
                  R$ {o.total.toFixed(2)}
               </div>
            </div>

            {o.customer.observations && (
               <div className="mb-3 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-xs text-yellow-200">
                  <div className="flex items-center gap-1 font-bold mb-1"><MessageSquare size={10} /> Obs:</div>
                  {o.customer.observations}
               </div>
            )}

            {o.customer.paymentMethod === 'cash' && o.customer.needChange && (
               <div className="mb-3 bg-green-500/10 border border-green-500/20 p-2 rounded text-xs text-green-200 font-bold">
                  Troco para R$ {o.customer.changeFor}
               </div>
            )}

            {nextStatus && nextLabel && (
               <button
                  onClick={() => updateStatus(o, nextStatus)}
                  className={`w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${nextStatus === 'pronto' ? 'bg-green-600 hover:bg-green-700' : nextStatus === 'entregue' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
               >
                  {nextLabel} {nextIcon}
               </button>
            )}
         </div>
      );
   };

   if (!isAuthenticated) {
      return (
         <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <div className="w-full max-sm bg-neutral-900 border border-neutral-800 p-8 rounded-xl shadow-neon">
               <div className="text-center mb-8">
                  <h1 className="text-3xl font-display font-bold text-white">KAL <span className="text-orange-500">ADMIN</span></h1>
                  <p className="text-neutral-500">Acesso Restrito</p>
               </div>
               <form onSubmit={handleLogin} className="space-y-4">
                  <input type="text" placeholder="Usuário" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-white focus:border-orange-500 focus:outline-none" value={loginForm.user} onChange={e => setLoginForm({ ...loginForm, user: e.target.value })} />
                  <input type="password" placeholder="Senha" className="w-full bg-neutral-950 border border-neutral-800 p-3 rounded text-white focus:border-orange-500 focus:outline-none" value={loginForm.pass} onChange={e => setLoginForm({ ...loginForm, pass: e.target.value })} />
                  <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded shadow-neon transition-colors">Entrar</button>
               </form>
               <button onClick={onLogout} className="w-full text-center text-neutral-500 text-sm mt-4 hover:text-white">Voltar à Loja</button>
            </div>
         </div>
      );
   }

   // Filter Orders for Kanban
   const pendingOrders = orders.filter(o => o.status === 'pendente');
   const preparingOrders = orders.filter(o => o.status === 'preparando');
   const readyOrders = orders.filter(o => o.status === 'pronto');

   return (
      <div className="flex min-h-screen bg-black text-white font-sans relative">

         {/* SUCCESS TOAST - Fixed position */}
         {toast && (
            <div className="fixed top-6 right-6 z-[100] animate-bounce-in flex items-center gap-3 bg-white text-neutral-800 px-5 py-4 rounded-xl shadow-2xl border border-neutral-200 min-w-[300px]">
               <div className="bg-green-500 p-1 rounded-full text-white">
                  <Check size={18} strokeWidth={4} />
               </div>
               <span className="font-semibold text-sm">{toast.message}</span>
            </div>
         )}
         <style>{`
        @keyframes bounceIn {
          0% { transform: translateX(100%) scale(0.9); opacity: 0; }
          70% { transform: translateX(-10px) scale(1.05); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

         {/* Sidebar */}
         <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col hidden md:flex">
            <div className="p-6 border-b border-neutral-800">
               <h2 className="text-2xl font-display font-bold text-orange-500">KAL <span className="text-white">ADMIN</span></h2>
            </div>
            <nav className="flex-1 p-4 space-y-2">
               <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'overview' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800'}`}><LayoutDashboard size={20} /> Visão Geral</button>
               <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'orders' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800'}`}><ClipboardList size={20} /> Pedidos</button>
               <button onClick={() => setActiveTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'menu' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800'}`}><UtensilsCrossed size={20} /> Cardápio</button>
               <button onClick={() => setActiveTab('promo')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'promo' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800'}`}><Megaphone size={20} /> Promoção</button>
               <button onClick={() => setActiveTab('ai')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'ai' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800'}`}><Bot size={20} /> Agente IA</button>
               <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-orange-600 text-white font-bold shadow-neon' : 'text-neutral-400 hover:bg-neutral-800'}`}><Settings size={20} /> Configurações</button>
            </nav>
            <div className="p-4 border-t border-neutral-800"><button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg"><LogOut size={18} /> Sair</button></div>
         </aside>

         {/* Mobile Nav */}
         <div className="md:hidden fixed bottom-0 w-full bg-neutral-900 border-t border-neutral-800 z-50 flex justify-around p-2">
            <button onClick={() => setActiveTab('overview')} className={`p-2 rounded-lg ${activeTab === 'overview' ? 'text-orange-500' : 'text-neutral-400'}`}><LayoutDashboard size={24} /></button>
            <button onClick={() => setActiveTab('orders')} className={`p-2 rounded-lg ${activeTab === 'orders' ? 'text-orange-500' : 'text-neutral-400'}`}><ClipboardList size={24} /></button>
            <button onClick={() => setActiveTab('menu')} className={`p-2 rounded-lg ${activeTab === 'menu' ? 'text-orange-500' : 'text-neutral-400'}`}><UtensilsCrossed size={24} /></button>
            <button onClick={() => setActiveTab('promo')} className={`p-2 rounded-lg ${activeTab === 'promo' ? 'text-orange-500' : 'text-neutral-400'}`}><Megaphone size={24} /></button>
            <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg ${activeTab === 'settings' ? 'text-orange-500' : 'text-neutral-400'}`}><Settings size={24} /></button>
            <button onClick={onLogout} className="p-2 text-red-500"><LogOut size={24} /></button>
         </div>

         <main className="flex-1 overflow-y-auto bg-black p-4 md:p-8 pb-24 md:pb-8">

            {/* DASHBOARD OVERVIEW */}
            {activeTab === 'overview' && (
               <div className="space-y-6 animate-fade-in">
                  <h1 className="text-3xl font-display font-bold text-white mb-6">Visão Geral</h1>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg flex items-center gap-4">
                        <div className="p-3 bg-orange-500/10 rounded-lg text-orange-500"><DollarSign size={24} /></div>
                        <div>
                           <p className="text-sm text-neutral-400">Faturamento Hoje</p>
                           <p className="text-2xl font-bold text-white">R$ {stats.totalRevenue.toFixed(2)}</p>
                        </div>
                     </div>
                     <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500"><ShoppingBag size={24} /></div>
                        <div>
                           <p className="text-sm text-neutral-400">Pedidos Hoje</p>
                           <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
                        </div>
                     </div>
                     <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 rounded-lg text-green-500"><TrendingUp size={24} /></div>
                        <div>
                           <p className="text-sm text-neutral-400">Ticket Médio</p>
                           <p className="text-2xl font-bold text-white">R$ {stats.averageTicket.toFixed(2)}</p>
                        </div>
                     </div>
                     <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg text-purple-500"><Activity size={24} /></div>
                        <div>
                           <p className="text-sm text-neutral-400">Pedidos Pendentes</p>
                           <p className="text-2xl font-bold text-white">{pendingOrders.length}</p>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     {/* Recent Orders Table */}
                     <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
                        <div className="p-5 border-b border-neutral-800 flex justify-between items-center">
                           <h3 className="font-bold text-lg text-white">Últimos Pedidos</h3>
                           <button onClick={() => setActiveTab('orders')} className="text-xs text-orange-500 hover:text-orange-400 font-bold uppercase">Ver Todos</button>
                        </div>
                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm">
                              <thead className="bg-neutral-950 text-neutral-400 uppercase font-bold text-xs">
                                 <tr>
                                    <th className="p-4">Pedido</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Total</th>
                                    <th className="p-4">Status</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-800">
                                 {orders.length > 0 ? orders.slice(0, 5).map(order => (
                                    <tr key={order.id} className="hover:bg-neutral-800/50 transition-colors">
                                       <td className="p-4 font-bold text-white">{order.id}</td>
                                       <td className="p-4 text-neutral-300">{order.customer.customerName}</td>
                                       <td className="p-4 font-mono text-orange-400">R$ {order.total.toFixed(2)}</td>
                                       <td className="p-4">
                                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${order.status === 'pendente' ? 'bg-yellow-500/20 text-yellow-500' :
                                             order.status === 'preparando' ? 'bg-orange-500/20 text-orange-500' :
                                                order.status === 'pronto' ? 'bg-green-500/20 text-green-500' :
                                                   order.status === 'entregue' ? 'bg-blue-500/20 text-blue-500' :
                                                      'bg-red-500/20 text-red-500'
                                             }`}>
                                             {order.status === 'pendente' ? 'Recebido' :
                                                order.status === 'preparando' ? 'Preparando' :
                                                   order.status === 'pronto' ? 'Pronto' :
                                                      order.status === 'entregue' ? 'Concluído' : 'Cancelado'}
                                          </span>
                                       </td>
                                    </tr>
                                 )) : (
                                    <tr><td colSpan={4} className="p-8 text-center text-neutral-500">Nenhum pedido hoje.</td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>

                     {/* Top Items */}
                     <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg p-5">
                        <h3 className="font-bold text-lg text-white mb-4">Mais Vendidos</h3>
                        {stats.topItems.length > 0 ? (
                           <div className="space-y-4">
                              {stats.topItems.map((item, index) => (
                                 <div key={item.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                       <span className="text-neutral-300 font-bold">{index + 1}. {item.name}</span>
                                       <span className="text-orange-500 font-bold">{item.count} un</span>
                                    </div>
                                    <div className="w-full bg-neutral-800 rounded-full h-2">
                                       <div
                                          className="bg-orange-600 h-2 rounded-full"
                                          style={{ width: `${(item.count / stats.topItems[0].count) * 100}%` }}
                                       />
                                    </div>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <p className="text-neutral-500 text-sm text-center py-4">Sem dados de vendas ainda.</p>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {/* ORDERS KANBAN (Formerly Dashboard) */}
            {activeTab === 'orders' && (
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
                              <OrderCard
                                 key={o.id}
                                 o={o}
                                 nextStatus="preparando"
                                 nextLabel="Aceitar e Preparar"
                                 nextIcon={<ArrowRight size={14} />}
                              />
                           ))}
                        </div>

                        {/* PREPARING */}
                        <div className="flex-1 bg-neutral-900/50 rounded-xl border border-neutral-800 p-4 flex flex-col gap-4">
                           <div className="flex justify-between items-center text-orange-500 font-bold border-b border-neutral-800 pb-2">
                              <span>Na Cozinha ({preparingOrders.length})</span>
                              <ChefHat size={18} />
                           </div>
                           {preparingOrders.map(o => (
                              <OrderCard
                                 key={o.id}
                                 o={o}
                                 nextStatus="pronto"
                                 nextLabel="Marcar como Pronto"
                                 nextIcon={<CheckCircle size={14} />}
                              />
                           ))}
                        </div>

                        {/* READY */}
                        <div className="flex-1 bg-neutral-900/50 rounded-xl border border-neutral-800 p-4 flex flex-col gap-4">
                           <div className="flex justify-between items-center text-green-500 font-bold border-b border-neutral-800 pb-2">
                              <span>Pronto / Entrega ({readyOrders.length})</span>
                              <CheckCircle size={18} />
                           </div>
                           {readyOrders.map(o => (
                              <OrderCard
                                 key={o.id}
                                 o={o}
                                 nextStatus="entregue"
                                 nextLabel="Finalizar Pedido"
                                 nextIcon={<MapPin size={14} />}
                              />
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
                     <button onClick={createNewItem} className="bg-orange-600 px-4 py-2 rounded text-white font-bold flex items-center gap-2"><Plus size={20} /> Novo</button>
                  </div>
                  {editingItem ? (
                     <form onSubmit={handleSaveItem} className="bg-neutral-900 p-6 rounded-xl border border-orange-500/30 grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex justify-between"><h3 className="font-bold">Editar Item</h3><button type="button" onClick={() => setEditingItem(null)}><LogOut className="rotate-180" /></button></div>
                        <input required value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} placeholder="Nome" className="bg-neutral-950 border border-neutral-800 p-3 rounded text-white" />
                        <input required type="number" value={editingItem.price} onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })} placeholder="Preço" className="bg-neutral-950 border border-neutral-800 p-3 rounded text-white" />
                        <select value={editingItem.category} onChange={e => setEditingItem({ ...editingItem, category: e.target.value as Category })} className="bg-neutral-950 border border-neutral-800 p-3 rounded text-white">{Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <div className="flex gap-2">
                           <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-neutral-800 p-3 rounded text-white flex-1"><Camera /></button>
                           <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                           <input value={editingItem.image} onChange={e => setEditingItem({ ...editingItem, image: e.target.value })} placeholder="URL Imagem" className="bg-neutral-950 border border-neutral-800 p-3 rounded text-white flex-[3] text-xs" />
                        </div>
                        <textarea value={editingItem.description} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })} placeholder="Descrição" className="col-span-2 bg-neutral-950 border border-neutral-800 p-3 rounded text-white h-24" />
                        <div className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={editingItem.popular} onChange={e => setEditingItem({ ...editingItem, popular: e.target.checked })} className="accent-orange-500" /> <label>Popular?</label></div>
                        <button type="submit" className="col-span-2 bg-orange-600 hover:bg-orange-700 py-3 rounded text-white font-bold transition-all active:scale-95">Salvar</button>
                     </form>
                  ) : (
                     <div className="grid gap-4">
                        {menuItems.map(item => (
                           <div key={item.id} className="flex justify-between items-center bg-neutral-900 p-4 rounded border border-neutral-800">
                              <div className="flex items-center gap-3"><img src={item.image} className="w-10 h-10 rounded object-cover" /> <span>{item.name}</span></div>
                              <div className="flex gap-2"><button onClick={() => setEditingItem(item)} className="p-2 text-blue-400"><Edit2 /></button><button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-400"><Trash2 /></button></div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            )}

            {/* PROMO EDITOR */}
            {activeTab === 'promo' && (
               <div className="space-y-6 animate-fade-in max-w-2xl">
                  <h1 className="text-3xl font-bold flex items-center gap-2">Configurar Promoção <Megaphone className="text-orange-500" /></h1>
                  <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-4">
                     <div className="flex items-center justify-between bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                        <div className="flex flex-col">
                           <span className="font-bold text-white">Status do Pop-up</span>
                           <span className="text-xs text-neutral-500">Exibir para clientes ao abrir a loja?</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                           <input type="checkbox" className="sr-only peer" checked={localSettings.promo.isActive} onChange={e => setLocalSettings({ ...localSettings, promo: { ...localSettings.promo, isActive: e.target.checked } })} />
                           <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                     </div>

                     <div>
                        <label className="text-sm text-neutral-400">Título do Pop-up</label>
                        <input
                           value={localSettings.promo.title}
                           onChange={e => setLocalSettings({ ...localSettings, promo: { ...localSettings.promo, title: e.target.value } })}
                           placeholder="Ex: Prato do Dia, Oferta Relâmpago"
                           className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800 focus:border-orange-500 outline-none"
                        />
                     </div>

                     <div>
                        <label className="text-sm text-neutral-400">Descrição</label>
                        <textarea
                           value={localSettings.promo.description}
                           onChange={e => setLocalSettings({ ...localSettings, promo: { ...localSettings.promo, description: e.target.value } })}
                           placeholder="Detalhes deliciosos..."
                           className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800 focus:border-orange-500 outline-none h-24"
                        />
                     </div>

                     {/* Badge Text Input */}
                     <div>
                        <label className="text-sm text-neutral-400">Texto do Selo (Badge)</label>
                        {/* Corrected property access: badgeText exists on the promo object */}
                        <input
                           value={localSettings.promo.badgeText}
                           onChange={e => setLocalSettings({ ...localSettings, promo: { ...localSettings.promo, badgeText: e.target.value } })}
                           placeholder="Ex: Recomendação da chefa, Destaque, Imperdível"
                           className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800 focus:border-orange-500 outline-none"
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-sm text-neutral-400">Preço (R$)</label>
                           <input
                              type="number"
                              step="0.10"
                              value={localSettings.promo.price}
                              onChange={e => setLocalSettings({ ...localSettings, promo: { ...localSettings.promo, price: parseFloat(e.target.value) } })}
                              className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800 focus:border-orange-500 outline-none"
                           />
                        </div>
                        <div>
                           <label className="text-sm text-neutral-400">Imagem URL</label>
                           <input
                              value={localSettings.promo.image}
                              onChange={e => setLocalSettings({ ...localSettings, promo: { ...localSettings.promo, image: e.target.value } })}
                              className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800 focus:border-orange-500 outline-none"
                           />
                        </div>
                     </div>

                     <div className="p-4 bg-neutral-950 rounded-lg border border-neutral-800 flex gap-4 items-center">
                        <img src={localSettings.promo.image} alt="Preview" className="w-16 h-16 rounded object-cover border border-neutral-700" />
                        <div className="text-sm text-neutral-500">
                           Preview da imagem. Certifique-se que o link é válido.
                        </div>
                     </div>

                     <button onClick={saveSettings} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl w-full shadow-neon transition-all duration-200 active:scale-95 transform">Salvar Alterações</button>
                  </div>
               </div>
            )}

            {/* AI & SETTINGS (Combined simplified for space) */}
            {(activeTab === 'ai' || activeTab === 'settings') && (
               <div className="space-y-6 animate-fade-in max-w-2xl">
                  <h1 className="text-3xl font-bold">{activeTab === 'ai' ? 'IA' : 'Configurações'}</h1>
                  <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 space-y-4">
                     {activeTab === 'ai' ? (
                        <textarea value={localSettings.systemInstruction} onChange={e => setLocalSettings({ ...localSettings, systemInstruction: e.target.value })} className="w-full h-64 bg-neutral-950 p-4 rounded text-white" />
                     ) : (
                        <>
                           <div><label className="text-sm text-neutral-400">WhatsApp Loja</label><input value={localSettings.whatsappNumber} onChange={e => setLocalSettings({ ...localSettings, whatsappNumber: e.target.value })} className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800" /></div>
                           <div><label className="text-sm text-neutral-400">Chave PIX</label><input value={localSettings.pixKey} onChange={e => setLocalSettings({ ...localSettings, pixKey: e.target.value })} className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800" /></div>

                           {/* Layout Selector Restored */}
                           <div><label className="text-sm text-neutral-400">Layout do Cardápio</label>
                              <div className="grid grid-cols-2 gap-4 mt-1">
                                 <button onClick={() => setLocalSettings({ ...localSettings, menuLayout: 'standard' })} className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-2 transition-all ${localSettings.menuLayout === 'standard' ? 'bg-orange-600 border-orange-600 text-white shadow-neon' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
                                    <div className="w-8 h-10 bg-neutral-800 rounded border border-neutral-600" />
                                    Padrão (Grande)
                                 </button>
                                 <button onClick={() => setLocalSettings({ ...localSettings, menuLayout: 'minimal' })} className={`p-3 rounded-lg border text-sm font-bold flex flex-col items-center gap-2 transition-all ${localSettings.menuLayout === 'minimal' ? 'bg-orange-600 border-orange-600 text-white shadow-neon' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
                                    <div className="w-8 h-8 bg-neutral-800 rounded border border-neutral-600" />
                                    Minimalista (Pequeno)
                                 </button>
                              </div>
                           </div>

                           <div><label className="text-sm text-neutral-400">Taxa de Entrega (R$)</label><input type="number" step="0.50" value={localSettings.deliveryFee} onChange={e => setLocalSettings({ ...localSettings, deliveryFee: parseFloat(e.target.value) })} className="w-full bg-neutral-950 p-3 rounded text-white border border-neutral-800" /></div>
                           <div><label className="text-sm text-orange-400">Webhook n8n (Integração)</label><input value={localSettings.n8nWebhookUrl} onChange={e => setLocalSettings({ ...localSettings, n8nWebhookUrl: e.target.value })} placeholder="https://seu-n8n.com/webhook/..." className="w-full bg-neutral-950 p-3 rounded text-white border border-orange-500/30" /></div>
                        </>
                     )}
                     <button onClick={saveSettings} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl w-full shadow-neon transition-all duration-200 active:scale-95 transform">Salvar Tudo</button>
                  </div>
               </div>
            )}
         </main>
      </div>
   );
};

export default AdminDashboard;
