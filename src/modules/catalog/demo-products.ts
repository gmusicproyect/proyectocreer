export const categories = [
  "Todos",
  "Bebidas",
  "Escritório",
  "Bolsas",
  "Casa",
  "Kits",
] as const;

export type DemoCategory = Exclude<(typeof categories)[number], "Todos">;

export interface DemoProduct {
  code: string;
  name: string;
  category: DemoCategory;
  image: string;
  description: string;
}

export const demoProducts: DemoProduct[] = [
  {
    code: "18839",
    name: "Caneca Térmica com Cortiça 500 ml",
    category: "Bebidas",
    image: "/catalog/18839-caneca-termica-500ml.jpg",
    description: "Caneca térmica com base de cortiça e opções de cores.",
  },
  {
    code: "06100",
    name: "Caderno A5 em Poliéster",
    category: "Escritório",
    image: "/catalog/06100-caderno-a5.jpg",
    description: "Caderno executivo A5 com acabamento em poliéster.",
  },
  {
    code: "14851",
    name: "Mochila Saco de Algodão",
    category: "Bolsas",
    image: "/catalog/14851-mochila-saco.jpg",
    description: "Mochila leve em algodão para ações e eventos.",
  },
  {
    code: "18584B",
    name: "Tábua de Corte com Canaleta",
    category: "Casa",
    image: "/catalog/18584b-tabua-canaleta.jpg",
    description: "Tábua de madeira com canaleta para uso diário.",
  },
  {
    code: "15384",
    name: "Garrafa rPET 700 ml",
    category: "Bebidas",
    image: "/catalog/15384-garrafa-rpet.jpg",
    description: "Garrafa produzida com material reciclado rPET.",
  },
  {
    code: "08067",
    name: "Sacola de Linho",
    category: "Bolsas",
    image: "/catalog/08067-sacola-linho.jpg",
    description: "Sacola reutilizável com textura natural de linho.",
  },
  {
    code: "00007",
    name: "Caneta Ecológica",
    category: "Escritório",
    image: "/catalog/00007-caneta-ecologica.jpg",
    description: "Caneta em papelão reciclado com detalhes coloridos.",
  },
  {
    code: "15383",
    name: "Caneta de Bambu",
    category: "Escritório",
    image: "/catalog/15383-caneta-bambu.jpg",
    description: "Caneta em bambu para brindes de perfil natural.",
  },
  {
    code: "15323",
    name: "Copo Fibra de Arroz 550 ml",
    category: "Bebidas",
    image: "/catalog/15323-copo-arroz-550ml.jpg",
    description: "Copo de 550 ml produzido com fibra de arroz.",
  },
  {
    code: "14661",
    name: "Bloco Ecológico com Caneta",
    category: "Escritório",
    image: "/catalog/14661-bloco-caneta.jpg",
    description: "Bloco de anotações acompanhado de caneta ecológica.",
  },
  {
    code: "14498",
    name: "Copo Fibra de Bambu 350 ml",
    category: "Bebidas",
    image: "/catalog/14498-copo-bambu-350ml.jpg",
    description: "Copo compacto em fibra de bambu para o dia a dia.",
  },
  {
    code: "18609",
    name: "Petisqueira de Bambu",
    category: "Casa",
    image: "/catalog/18609-petisqueira-bambu.jpg",
    description: "Petisqueira de bambu em formato 30 × 20 cm.",
  },
  {
    code: "07086",
    name: "Bolsa Térmica 5 Litros",
    category: "Bolsas",
    image: "/catalog/07086-bolsa-termica.jpg",
    description: "Bolsa térmica compacta para refeições e bebidas.",
  },
  {
    code: "08095",
    name: "Kit Ecológico 2 Peças",
    category: "Kits",
    image: "/catalog/08095-kit-ecologico.jpg",
    description: "Conjunto ecológico para presentear equipes e clientes.",
  },
  {
    code: "18836",
    name: "Kit Executivo Ecológico 3 Peças",
    category: "Kits",
    image: "/catalog/18836-kit-executivo.jpg",
    description: "Kit executivo em bambu com três peças.",
  },
  {
    code: "18838",
    name: "Caneca Térmica com Cortiça 400 ml",
    category: "Bebidas",
    image: "/catalog/18838-caneca-termica-400ml.jpg",
    description: "Caneca térmica compacta com base em cortiça.",
  },
  {
    code: "18600",
    name: "Tábua de Corte com Alça",
    category: "Casa",
    image: "/catalog/18600-tabua-alca.jpg",
    description: "Tábua de madeira com alça para servir e preparar.",
  },
  {
    code: "P@14962",
    name: "Sacola de Algodão",
    category: "Bolsas",
    image: "/catalog/p14962-sacola-algodao.jpg",
    description: "Sacola reutilizável de algodão em diversas cores.",
  },
  {
    code: "15527",
    name: "Espelho de Bambu",
    category: "Casa",
    image: "/catalog/15527-espelho-bambu.jpg",
    description: "Espelho compacto com acabamento natural em bambu.",
  },
  {
    code: "06106",
    name: "Bloco com Autoadesivos e Caneta",
    category: "Escritório",
    image: "/catalog/06106-bloco-autoadesivos.jpg",
    description: "Bloco kraft com notas autoadesivas e caneta.",
  },
];

const productColors: Record<string, string[]> = {
  "18839": ["Azul", "Branco", "Preto", "Rosa", "Verde", "Vermelho"],
  "06100": ["Azul", "Bege", "Preto", "Verde", "Vermelho", "Vinho"],
  "14851": ["Bege"],
  "18584B": ["Madeira natural"],
  "15384": ["Laranja", "Preto", "Transparente", "Verde", "Vermelho"],
  "08067": ["Bege"],
  "00007": ["Amarelo", "Branco", "Preto", "Verde", "Laranja", "Vermelho"],
  "15383": ["Bambu natural"],
  "15323": ["Azul", "Bege", "Fibra", "Preto", "Rosa", "Verde", "Vermelho"],
  "14661": ["Kraft"],
  "14498": ["Amarelo", "Preto", "Rosa", "Verde", "Vermelho"],
  "18609": ["Bambu natural"],
  "07086": ["Natural"],
  "08095": ["Natural", "Branco"],
  "18836": ["Natural", "Bege"],
  "18838": ["Azul", "Branco", "Cinza", "Laranja", "Preto", "Verde"],
  "18600": ["Madeira natural"],
  "P@14962": [
    "Natural",
    "Azul claro",
    "Azul escuro",
    "Laranja",
    "Preto",
    "Vermelho",
  ],
  "15527": ["Bambu natural"],
  "06106": ["Kraft"],
};

export function getDemoProduct(code: string) {
  return demoProducts.find((product) => product.code === code);
}

export function getDemoProductColors(code: string) {
  return productColors[code] ?? ["A confirmar"];
}

export function getDemoProductImages(product: DemoProduct) {
  const safeCode = product.code.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
  return [
    product.image,
    `/catalog/gallery/${safeCode}-1.jpg`,
    `/catalog/gallery/${safeCode}-2.jpg`,
  ];
}
