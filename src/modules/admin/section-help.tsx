import { modules } from "./navigation";

type Section = (typeof modules)[number]["slug"];

// Ajuda escrita para o Lucas: primeiro diz se há algo para fazer na área,
// depois os passos com os nomes exatos dos botões da tela.
const instructions: Record<Section, { when: string; steps: readonly string[] }> = {
  "": {
    when: "Não. É só um resumo do movimento.",
    steps: [
      "Veja quantos produtos, clientes e orçamentos existem e os pedidos mais recentes.",
      "Se chegou um pedido novo, abra Orçamentos para responder ao cliente.",
    ],
  },
  produtos: {
    when: "Sim, quando chegar um produto novo ou quando precisar mudar preço, foto ou estado de um produto.",
    steps: [
      "Produto novo: toque em + Novo produto e preencha código, nome, categoria e preço. O código não pode ser mudado depois de salvar.",
      "Produto que já existe: toque em Editar ficha completa.",
      "Fotos: salve o produto primeiro. Depois, em Enviar imagens, escolha até 3 fotos (JPG, PNG ou WEBP, até 3 MB cada). Enviar outra foto no mesmo espaço troca a anterior.",
      "Estado: Publicado mostra o produto no catálogo, Pendente indica que ainda falta alguma informação e Inativo tira o produto do catálogo.",
      "Para publicar, o produto precisa de nome, categoria, preço, descrição e imagem principal.",
      "Custo e fornecedor ficam em Custo interno. Os clientes nunca veem essas informações.",
    ],
  },
  categorias: {
    when: "Só se quiser criar um novo grupo de produtos ou mudar o nome ou a ordem de um grupo.",
    steps: [
      "Nova categoria: toque em + Nova categoria, escreva o nome e toque em Criar categoria.",
      "Mudar uma categoria: toque em Editar. Você pode mudar o nome, a ordem no catálogo e se ela está ativa.",
      "Se mudar o nome, os produtos dessa categoria passam a usar o novo nome sozinhos.",
    ],
  },
  clientes: {
    when: "Só se quiser guardar ou corrigir os dados de uma empresa ou de um contato.",
    steps: [
      "Cliente novo: toque em + Novo cliente, preencha os dados e toque em Cadastrar cliente.",
      "Corrigir: toque em Editar no cliente.",
      "Cada e-mail só pode ser usado uma vez. Se aparecer E-mail repetido, corrija o e-mail de um dos cadastros.",
      "Esses dados ficam só aqui no painel; não aparecem no catálogo.",
    ],
  },
  orcamentos: {
    when: "Sim, sempre que entrar um pedido novo de orçamento.",
    steps: [
      "Cada pedido mostra quem pediu, os produtos e os dados de contato.",
      "Responda ao cliente pelo e-mail ou telefone do pedido. O painel não envia mensagens.",
      "Depois, toque em Atualizar situação para marcar a etapa (por exemplo, Em análise ou Cotada) e anotar o que foi combinado.",
      "O cliente não vê essas notas.",
    ],
  },
  equipe: {
    when: "Não. Esta tela só explica o que cada tipo de usuário pode fazer.",
    steps: [
      "Administrador da Creer pode mudar tudo, inclusive custos. Vendas cuida de clientes e orçamentos. Editor de catálogo cuida dos produtos e categorias.",
      "Para dar acesso a outra pessoa, fale com o responsável pela demonstração.",
    ],
  },
  assinatura: {
    when: "Não, por enquanto.",
    steps: [
      "Esta área ainda está em preparação.",
      "Não há nenhuma cobrança ativa e você não precisa pagar nada.",
    ],
  },
};

export function SectionHelp({ section, name }: { section: Section; name: string }) {
  const help = instructions[section];
  return (
    <details className="section-help">
      <summary aria-label={`Como usar: ${name}`} title={`Como usar: ${name}`}>
        <span aria-hidden="true">?</span>
      </summary>
      <div className="section-help-content">
        <h2>Como usar esta área</h2>
        <p className="section-help-when"><strong>Preciso fazer algo aqui?</strong> {help.when}</p>
        <ol>{help.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p>Se algum botão não aparecer, fale com o responsável pela demonstração. Toque no ? de novo para fechar.</p>
      </div>
    </details>
  );
}
