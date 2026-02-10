import React, { useState, useRef } from 'react';
import { ShoppingBag, Flame, Menu as MenuIcon, ShieldCheck } from 'lucide-react';
import { MENU_ITEMS, DEFAULT_SYSTEM_INSTRUCTION, WHATSAPP_NUMBER } from './constants';
import { Category, CartItem, MenuItem } from './types';
import MenuCard from './components/MenuCard';
import HighlightCard from './components/HighlightCard';
import CartSidebar from './components/CartSidebar';
import GeminiAssistant from './components/GeminiAssistant';
import AdminDashboard from './components/AdminDashboard';

interface AnimationElement {
  id: number;
  x: number;
  y: number;
  image: string;
}

const App: React.FC = () => {
  // Application State
  const [viewMode, setViewMode] = useState<'customer' | 'admin'>('customer');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [aiInstruction, setAiInstruction] = useState<string>(DEFAULT_SYSTEM_INSTRUCTION);
  const [whatsappNumber, setWhatsappNumber] = useState<string>(WHATSAPP_NUMBER);
  const [menuLayout, setMenuLayout] = useState<'standard' | 'minimal'>('standard');
  
  // Customer View State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Todos'>('Todos');
  const [animations, setAnimations] = useState<AnimationElement[]>([]);
  
  const cartIconRef = useRef<HTMLDivElement>(null);

  // Constants
  const categories = Object.values(Category);
  
  // Helpers
  const addToCart = (item: MenuItem, event?: React.MouseEvent) => {
    // Start Animation
    if (event && cartIconRef.current) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      
      const newAnim: AnimationElement = {
        id: Date.now(),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        image: item.image
      };
      
      setAnimations(prev => [...prev, newAnim]);
      
      // Remove animation element after it completes
      setTimeout(() => {
        setAnimations(prev => prev.filter(a => a.id !== newAnim.id));
      }, 800);
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  // If Admin View
  if (viewMode === 'admin') {
    return (
      <AdminDashboard 
        menuItems={menuItems}
        onUpdateMenu={setMenuItems}
        systemInstruction={aiInstruction}
        onUpdateInstruction={setAiInstruction}
        whatsappNumber={whatsappNumber}
        onUpdateWhatsapp={setWhatsappNumber}
        menuLayout={menuLayout}
        onUpdateMenuLayout={setMenuLayout}
        onLogout={() => setViewMode('customer')}
      />
    );
  }

  // Customer View Logic
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const filteredItems = selectedCategory === 'Todos' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const highlights = menuItems.filter(item => item.popular);

  return (
    <div className="min-h-screen bg-black text-neutral-200 font-sans pb-20 overflow-x-hidden">
      
      {/* Animation Layer */}
      <div className="fixed inset-0 pointer-events-none z-[100]">
        {animations.map(anim => (
          <div 
            key={anim.id}
            className="fixed w-12 h-12 rounded-full border-2 border-orange-500 shadow-neon overflow-hidden z-[100]"
            style={{
              left: anim.x,
              top: anim.y,
              transform: 'translate(-50%, -50%)',
              animation: 'flyToCart 0.8s cubic-bezier(0.42, 0, 0.58, 1) forwards'
            }}
          >
            <img src={anim.image} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes flyToCart {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            left: calc(100vw - 40px);
            top: 40px;
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 0.5;
          }
        }
        @media (min-width: 640px) {
          @keyframes flyToCart {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { 
              left: ${cartIconRef.current?.getBoundingClientRect().left ?? 0 + 20}px; 
              top: ${cartIconRef.current?.getBoundingClientRect().top ?? 0 + 20}px; 
              transform: translate(-50%, -50%) scale(0.1); 
              opacity: 0; 
            }
          }
        }
      `}</style>
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-30 bg-black/80 backdrop-blur-md border-b border-orange-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <div className="bg-orange-600 p-2 rounded-lg shadow-neon">
                <Flame className="text-white" size={24} fill="currentColor" />
              </div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-wider">
                KAL DO <span className="text-orange-500">ESPETINHO</span>
              </h1>
            </div>

            {/* Desktop Categories */}
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => setSelectedCategory('Todos')}
                className={`text-sm font-bold uppercase tracking-wider hover:text-orange-500 transition-colors ${selectedCategory === 'Todos' ? 'text-orange-500' : 'text-neutral-400'}`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-sm font-bold uppercase tracking-wider hover:text-orange-500 transition-colors ${selectedCategory === cat ? 'text-orange-500' : 'text-neutral-400'}`}
                >
                  {cat.split(' ')[0]} 
                </button>
              ))}
            </div>

            {/* Cart Button */}
            <div ref={cartIconRef} className="relative p-2 text-white hover:text-orange-500 transition-colors group cursor-pointer" onClick={() => setIsCartOpen(true)}>
              <ShoppingBag size={28} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-neon">
                  {cartCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative mt-20 h-[40vh] sm:h-[50vh] w-full overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=2574&auto=format&fit=crop" 
            alt="BBQ Background" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold text-white mb-4 drop-shadow-2xl">
            SABOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">PREMIUM</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto mb-8">
            O melhor espetinho da cidade em um ambiente exclusivo. 
            Cerveja trincando e cortes selecionados.
          </p>
          <button 
            onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-full transition-all shadow-neon hover:shadow-neon-strong"
          >
            Pedir Agora
          </button>
        </div>
      </div>

      {/* Mobile Category Filter */}
      <div className="md:hidden sticky top-20 z-20 bg-black/95 border-b border-orange-900/30 overflow-x-auto py-4 px-4 scrollbar-hide">
        <div className="flex gap-3">
          <button 
            onClick={() => setSelectedCategory('Todos')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${selectedCategory === 'Todos' ? 'bg-orange-600 border-orange-600 text-white' : 'border-neutral-800 text-neutral-400'}`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${selectedCategory === cat ? 'bg-orange-600 border-orange-600 text-white' : 'border-neutral-800 text-neutral-400'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Menu Grid - Reduced top padding from py-12 to py-6 */}
      <main id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* HIGHLIGHTS SECTION (Compact Version) */}
        {highlights.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-display font-bold text-white mb-3 text-center sm:text-left border-l-4 border-red-600 pl-3">
              ✨ Destaques
            </h2>
            <div className="flex overflow-x-auto pb-2 gap-4 sm:gap-6 snap-x scrollbar-hide">
              {highlights.map(item => (
                <HighlightCard key={item.id} item={item} onAdd={(item, e) => addToCart(item, e)} />
              ))}
            </div>
            <hr className="border-neutral-800 mt-2" />
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white border-l-4 border-orange-500 pl-4">
            {selectedCategory === 'Todos' ? 'Nosso Cardápio' : selectedCategory}
          </h2>
        </div>

        <div className={`grid gap-6 ${menuLayout === 'minimal' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          {filteredItems.map(item => (
            <MenuCard 
              key={item.id} 
              item={item} 
              onAdd={(item, e) => addToCart(item, e)} 
              variant={menuLayout}
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20 text-neutral-500">
            <p>Nenhum item encontrado nesta categoria.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 border-t border-neutral-800 py-12 mt-12 relative">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
             <Flame className="text-orange-500" size={20} fill="currentColor" />
             <span className="font-display font-bold text-xl text-white uppercase">Kal do Espetinho</span>
          </div>
          <p className="text-neutral-500 text-sm mb-4">
            © {new Date().getFullYear()} Todos os direitos reservados.
            <br />
            Qualidade premium em cada brasa.
          </p>
          
          <button 
            onClick={() => setViewMode('admin')}
            className="text-neutral-700 hover:text-neutral-500 transition-colors text-xs flex items-center justify-center gap-1 mx-auto mt-4"
          >
            <ShieldCheck size={12} /> Painel Administrativo
          </button>
        </div>
      </footer>

      {/* Sidebars & Assistants */}
      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        cart={cart}
        onRemove={removeFromCart}
        onUpdateQuantity={updateQuantity}
        whatsappNumber={whatsappNumber}
      />
      
      <GeminiAssistant systemInstruction={aiInstruction} menuItems={menuItems} />
      
    </div>
  );
};

export default App;