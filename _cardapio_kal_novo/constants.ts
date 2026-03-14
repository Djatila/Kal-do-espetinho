
import { Category, MenuItem } from './types';

export const MENU_ITEMS: MenuItem[] = [
  // Espetinhos
  {
    id: '1',
    name: 'Espetinho de Picanha',
    description: 'Picanha Angus selecionada, temperada com sal grosso.',
    price: 18.00,
    category: Category.ESPETINHOS,
    image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=400&h=300&auto=format&fit=crop',
    popular: true
  },
  {
    id: '2',
    name: 'Medalhão de Frango',
    description: 'Cubos de peito de frango envoltos em bacon crocante.',
    price: 14.00,
    category: Category.ESPETINHOS,
    image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '14',
    name: 'Coração de Frango',
    description: 'Coraçãozinho marinado no vinho branco e ervas finas.',
    price: 13.00,
    category: Category.ESPETINHOS,
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?q=80&w=400&h=300&auto=format&fit=crop',
    popular: true
  },
  {
    id: '15',
    name: 'Pão de Alho Especial',
    description: 'Pão bolinha recheado com creme de alho e muito queijo.',
    price: 9.00,
    category: Category.ACOMPANHAMENTOS,
    image: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?q=80&w=400&h=300&auto=format&fit=crop',
    popular: true
  },
  {
    id: '16',
    name: 'Costela Bovina',
    description: 'Costela assada lentamente, desmanchando na boca.',
    price: 22.00,
    category: Category.ESPETINHOS,
    image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=400&h=300&auto=format&fit=crop',
    popular: true
  },
  {
    id: '3',
    name: 'Linguiça Cuiabana',
    description: 'Linguiça artesanal recheada com queijo coalho e ervas.',
    price: 12.00,
    category: Category.ESPETINHOS,
    image: 'https://images.unsplash.com/photo-1585325701166-381691273970?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '4',
    name: 'Kafta Premium',
    description: 'Carne moída temperada com hortelã e especiarias.',
    price: 12.00,
    category: Category.ESPETINHOS,
    image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '5',
    name: 'Queijo Coalho',
    description: 'Queijo coalho na brasa com melaço de cana opcional.',
    price: 10.00,
    category: Category.ESPETINHOS,
    image: 'https://images.unsplash.com/photo-1559561853-08451507cbe7?q=80&w=400&h=300&auto=format&fit=crop'
  },

  // Porções
  {
    id: '6',
    name: 'Tábua do Kal (Mista)',
    description: 'Picanha, linguiça, frango, fritas e farofa. Serve 3 pessoas.',
    price: 85.00,
    category: Category.PORCOES,
    image: 'https://images.unsplash.com/photo-1602484210602-d42353002747?q=80&w=400&h=300&auto=format&fit=crop',
    popular: true
  },
  {
    id: '7',
    name: 'Carne de Sol com Mandioca',
    description: 'Carne de sol serenada na manteiga de garrafa.',
    price: 65.00,
    category: Category.PORCOES,
    image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '8',
    name: 'Frango a Passarinho',
    description: 'Crocante, coberto com alho frito e salsinha.',
    price: 45.00,
    category: Category.PORCOES,
    image: 'https://images.unsplash.com/photo-1562967914-608f82629710?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '9',
    name: 'Batata Frita Especial',
    description: 'Fritas com cheddar e bacon crocante.',
    price: 32.00,
    category: Category.PORCOES,
    image: 'https://images.unsplash.com/photo-1573014320204-825bc531d044?q=80&w=400&h=300&auto=format&fit=crop'
  },

  // Bebidas
  {
    id: '10',
    name: 'Heineken 600ml',
    description: 'Estupidamente gelada.',
    price: 16.00,
    category: Category.BEBIDAS,
    image: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '11',
    name: 'Spaten 600ml',
    description: 'Cerveja puro malte.',
    price: 14.00,
    category: Category.BEBIDAS,
    image: 'https://images.unsplash.com/photo-1558644815-4c1d71c25c64?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '12',
    name: 'Caipirinha de Limão',
    description: 'Cachaça artesanal, limão taiti e açúcar.',
    price: 18.00,
    category: Category.BEBIDAS,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=400&h=300&auto=format&fit=crop'
  },
  {
    id: '13',
    name: 'Refrigerante Lata',
    description: 'Coca-cola, Guaraná, Sprite.',
    price: 6.00,
    category: Category.BEBIDAS,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=400&h=300&auto=format&fit=crop'
  }
];

export const WHATSAPP_NUMBER = "5511999999999";

export const DEFAULT_SYSTEM_INSTRUCTION = `
Você é o "Garçom Virtual do Kal", um assistente especialista em churrasco e harmonização de bebidas para o estabelecimento "Kal do Espetinho".
O ambiente é premium, escuro com neon laranja, sofisticado mas acolhedor.

Suas responsabilidades:
1. Sugerir combinações (ex: "A Picanha vai muito bem com uma Heineken gelada").
2. Explicar detalhes dos pratos.
3. Ser educado, breve e usar emojis relacionados a churrasco e cerveja 🍢🍺.
4. Se perguntarem algo fora do cardápio, diga gentilmente que não temos, mas sugira algo similar do menu.
5. Mantenha as respostas curtas (máximo 3 frases).
`;
