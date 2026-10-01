import { modules } from "./navigation";

type Section = (typeof modules)[number]["slug"];

const instructions: Record<Section, readonly string[]> = {
  "": [
    "Aqui você acompanha os totais de produtos, clientes e orçamentos e as solicitações recentes.",
    "Escolha uma área no menu para consultar os detalhes. Esta visão geral não altera os cadastros.",
  ],
  produtos: [
    "Use Novo produto para cadastrar ou Editar ficha completa para abrir um produto existente.",
    "Ao cadastrar, informe um código único, nome, categoria e preço. O código é preenchido por você e fica fixo depois de salvar.",
    "Salve o produto primeiro. Depois, em Enviar imagens, escolha até três fotos JPG, PNG ou WEBP de até 3 MB cada. Elas ficam associadas ao código do produto.",
    "Preencha descrição e imagem principal antes de publicar. Enquanto faltar algo, deixe como Pendente. Inativo retira o produto do catálogo.",
    "Os custos internos ficam na ficha e só aparecem para quem tem permissão; não aparecem no catálogo público.",
  ],
  categorias: [
    "As categorias agrupam os produtos e ajudam o cliente a encontrar o que procura no catálogo.",
    "Use os campos disponíveis para criar ou editar uma categoria e definir sua ordem. Salve e depois selecione a categoria na ficha do produto.",
  ],
  clientes: [
    "Consulte os contatos e as empresas atendidas. Use o formulário disponível para cadastrar ou atualizar um cliente.",
    "Confira os dados de contato antes de salvar. Essas informações ficam na área administrativa, fora do catálogo público.",
  ],
  orcamentos: [
    "Aqui você acompanha os pedidos de orçamento, os produtos solicitados e os dados de contato.",
    "Abra os detalhes e, quando disponível, atualize o andamento e as notas. Salvar o andamento não envia uma mensagem ao cliente.",
  ],
  equipe: [
    "Esta tabela explica o que cada papel pode consultar ou alterar, como administrador, vendas e editor do catálogo.",
    "Esta tela apenas mostra as permissões. Para cadastrar alguém ou mudar seu acesso, fale com o responsável pela demonstração.",
  ],
  assinatura: [
    "Esta área está em preparação para apresentar o plano, a manutenção e o suporte.",
    "Nenhuma cobrança está ativa nesta demonstração. Por enquanto, não é necessário contratar ou pagar nada aqui.",
  ],
};

export function SectionHelp({ section, name }: { section: Section; name: string }) {
  return (
    <details className="section-help">
      <summary aria-label={`Como usar: ${name}`} title={`Como usar: ${name}`}>
        <span aria-hidden="true">?</span>
      </summary>
      <div className="section-help-content">
        <h2>Como usar esta área</h2>
        <ol>{instructions[section].map((step) => <li key={step}>{step}</li>)}</ol>
        <p>Se os controles de edição não estiverem disponíveis, confira seu acesso com o responsável. Clique novamente no ? para fechar esta ajuda.</p>
      </div>
    </details>
  );
}
