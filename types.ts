export enum Category {
  ESPETINHOS = 'Espetinhos Premium',
  PORCOES = 'Porções Especiais',
  BEBIDAS = 'Bebidas Geladas',
  ACOMPANHAMENTOS = 'Acompanhamentos'
}

export interface PriceVariation {
  id: string;
  nome: string;
  valor: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string; // Mudado de Category para string para maior flexibilidade
  image: string;
  popular?: boolean;
  vendas?: number;
  rating?: string;
  isTopSeller?: boolean;
  tem_variacoes?: boolean;
  variacoes_preco?: PriceVariation[];
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash';
export type DeliveryMethod = 'delivery' | 'pickup' | 'table';
export type OrderStatus = 'pendente' | 'confirmado' | 'preparando' | 'pronto' | 'entregue' | 'cancelado';

export interface OrderDetails {
  customerName: string;
  customerPhone: string;
  deliveryMethod: DeliveryMethod;
  tableNumber: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    complement: string;
  };
  paymentMethod: PaymentMethod;
  needChange: boolean;
  changeFor: string;
  observations: string;
}

export interface Order {
  id: string;
  customer: OrderDetails;
  items: CartItem[];
  total: number;
  deliveryFee?: number;
  status: OrderStatus;
  createdAt: number;
}

export interface PromoSettings {
  isActive: boolean;
  title: string; // Ex: "Prato do Dia", "Promoção Relâmpago"
  description: string;
  price: number;
  image: string;
  badgeText: string; // Ex: "Recomendação da chefa"
}

export interface AppSettings {
  whatsappNumber: string;
  systemInstruction: string;
  n8nWebhookUrl: string;
  pixKey: string;
  menuLayout: 'standard' | 'minimal';
  deliveryFee: number;
  promo: PromoSettings;
}