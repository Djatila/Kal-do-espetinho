export enum Category {
  ESPETINHOS = 'Espetinhos Premium',
  PORCOES = 'Porções Especiais',
  BEBIDAS = 'Bebidas Geladas',
  ACOMPANHAMENTOS = 'Acompanhamentos'
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  popular?: boolean;
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
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'finished' | 'canceled';

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

export interface AppSettings {
  whatsappNumber: string;
  systemInstruction: string;
  n8nWebhookUrl: string;
  pixKey: string;
  menuLayout: 'standard' | 'minimal';
  deliveryFee: number;
}