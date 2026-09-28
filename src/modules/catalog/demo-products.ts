export interface DemoProduct {
  code: string;
  name: string;
  category: string;
  subcategory: string;
  image: string;
  images: string[];
  description: string;
  price: number | null;
  currency: "BRL";
  state: "PENDIENTE" | "PUBLICADO";
}

function driveImage(id: string) {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}`;
}

function product(
  code: string,
  name: string,
  category: string,
  subcategory: string,
  description: string,
  imageId: string,
): DemoProduct {
  const image = driveImage(imageId);
  return {
    code,
    name,
    category,
    subcategory,
    description,
    image,
    images: [image],
    price: null,
    currency: "BRL",
    state: "PENDIENTE",
  };
}

/** Copia segura para la presentación si Google Sheets no está disponible. */
export const demoProducts: DemoProduct[] = [
  product("P@08155", "Descanso de panela em cortiça", "Casa", "Cozinha", "Descanso de panela em cortiça, leve e resistente.", "1xiZwV8JnaZGQwV1Z6ZHZR0BOA7HuiZ-a"),
  product("18839", "Caneca térmica com cortiça 500 ml", "Bebidas", "Canecas", "Caneca térmica com detalhe em cortiça, capacidade de 500 ml.", "1S-8M66Q1cgeIB11CvcE29OJxkdIXwpvm"),
  product("18584B", "Tábua de corte com canaleta", "Casa", "Cozinha", "Tábua de corte em bambu com canaleta para uso diário.", "13U4TtWGflU-v7WbEI5Kk5vV7r_A7du25"),
  product("14851", "Mochila saco de algodão", "Bolsas", "Mochilas", "Mochila saco em algodão para ações promocionais.", "1kIKtUjgi2HNlnwz4U1hRq8B6Q9buGJgS"),
  product("06100", "Caderno A5 em poliéster", "Escritório", "Cadernos", "Caderno A5 com capa em poliéster para uso corporativo.", "1FQ48eIIY6gImcRWuDXNMlTdFZTyLFr9R"),
  product("07006", "Mochila rPET 9 L", "Bolsas", "Mochilas", "Mochila leve em material reciclado rPET, capacidade de 9 litros.", "1SetbetJVRsElhklVV8v1Vcrsd5FsYD4w"),
  product("06089", "Marmita de fibra de trigo", "Casa", "Alimentação", "Marmita reutilizável produzida em fibra de trigo.", "18E02dpXrdS3g_VN3Kc68IHBZSubm0Vco"),
  product("04361", "Caixa de som multimídia de bambu", "Tecnologia", "Áudio", "Caixa de som multimídia com acabamento em bambu.", "1_z_QLpCMGgNraQvuo2zZflcvzqpzulse"),
  product("03496", "Kit cozinha ecológico 3 peças", "Casa", "Cozinha", "Kit de cozinha com três peças para presentes corporativos.", "11MRFiN0dGgwZCGsqnSfzjvY8GQPlI1fd"),
  product("03006", "Copo de fibra de bambu 350 ml", "Bebidas", "Copos", "Copo reutilizável de fibra de bambu, capacidade de 350 ml.", "1VCWHT1pKbokKSmzNv-cdHr_YCcsYDhmx"),
  product("02601", "Caderneta Kraft B6 com porta-caneta", "Escritório", "Cadernetas", "Caderneta formato B6 em Kraft com porta-caneta.", "1g2w-AikjbEHFsvMST7yjovi2PNjB7JVp"),
  product("02403", "Garrafa térmica de bambu 400 ml com infusor", "Bebidas", "Garrafas", "Garrafa térmica com acabamento em bambu e infusor, capacidade de 400 ml.", "17WwOoAV3e5AzKHqQToDWNl9XXtVG5bEK"),
  product("01895", "Tapete de yoga ecológico", "Bem-estar", "Fitness", "Tapete de yoga em TPE ecológico para ações de saúde e bem-estar.", "17gI-5D8D_FHs884EB5_SZD872P48Tsxg"),
  product("01699", "Sacola térmica rPET 10 L", "Bolsas", "Térmicas", "Sacola térmica produzida em material reciclado rPET, capacidade de 10 litros.", "1YR66jqM1dZ4aiWnDO9r3VzO4JkSrgJHt"),
  product("01303", "Abridor de garrafa em madeira", "Casa", "Bar", "Abridor de garrafa em madeira para brindes e kits de bebidas.", "1H3RSndP058tdUfySGOYBOvKtQncybycm"),
  product("01008", "Tag identificador de bagagem em bambu", "Viagem", "Acessórios", "Identificador de bagagem com acabamento natural em bambu.", "12r-xerZr8Uyyg-uVnVS8te8ZvWjvSL1C"),
  product("00085", "Moedor de pimenta", "Casa", "Cozinha", "Moedor compacto para pimenta, indicado para kits gastronômicos.", "1UNAICXKz9M8NTV4ejrO3SdVNEiN-krTZ"),
  product("00033", "Pen drive de bambu giratório", "Tecnologia", "Pen drives", "Pen drive com acabamento em bambu e corpo giratório.", "1LjtGVvMgaV5hJCp0-EGq30nV2Lh1hJM6"),
  product("00016", "Caneta ecológica com suporte para celular", "Escritório", "Canetas", "Caneta multifuncional com suporte integrado para celular.", "1Nc3LripQM4hkd21OIThjehc2xSFmlfE-"),
  product("00001", "Caneta ecológica de papelão", "Escritório", "Canetas", "Caneta ecológica leve, ideal para ações promocionais e kits corporativos.", "17jWRQAKuvPOSb90I26BravgfIT1Sn8O4"),
];

export const categories = [
  "Todos",
  ...Array.from(new Set(demoProducts.map((item) => item.category))),
];

const productColors: Record<string, string[]> = {
  "P@08155": ["Cortiça natural"],
  "18839": ["Azul", "Branco", "Preto", "Rosa", "Verde", "Vermelho"],
  "06100": ["Azul", "Bege", "Preto", "Verde", "Vermelho", "Vinho"],
  "14851": ["Bege"],
  "18584B": ["Bambu natural"],
};

export function getDemoProduct(code: string) {
  return demoProducts.find((item) => item.code === code);
}

export function getDemoProductColors(code: string) {
  return productColors[code] ?? ["A confirmar"];
}

export function getDemoProductImages(product: DemoProduct) {
  return product.images.length ? product.images : [product.image];
}
