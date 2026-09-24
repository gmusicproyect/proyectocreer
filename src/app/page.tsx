import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { Catalog } from "@/modules/catalog/catalog";
export default function Home() {
  return (
    <PublicShell>
      <main id="conteudo">
        <section className="hero">
          <div>
            <p className="eyebrow">PRESENTES CORPORATIVOS · CREER</p>
            <h1>
              Pequenos gestos.
              <br />
              Grandes <em>conexões.</em>
            </h1>
            <p>
              Qualidade, propósito e a sua marca
              <br />
              sempre presente.
            </p>
            <Link className="button" href="#catalogo">
              Explorar catálogo <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="hero-note">
            <span className="hero-number">01 /</span>
            <p>
              Mais que
              <br />
              brindes.
              <br />
              <em>Pessoas.</em>
            </p>
            <span className="hero-caption">
              A SUA MARCA EM BOAS COMPANHIAS.
            </span>
          </div>
        </section>
        <Catalog />
        <section className="values" id="sobre">
          <div>
            <span>01</span>
            <h3>Com a sua identidade</h3>
            <p>Presentes pensados para representar a sua marca.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Para cada conexão</h3>
            <p>Boas-vindas, encontros e momentos para celebrar.</p>
          </div>
          <div>
            <span>03</span>
            <h3>Escolhas com propósito</h3>
            <p>Detalhes que fazem parte do dia a dia das pessoas.</p>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
