/* =====================================================================
   FERRAMENTAS.JS — Páginas-base para ferramentas operacionais
   ===================================================================== */

const FERRAMENTAS_CONFIG = {
  iauditor: {
    ativa: 'ferramenta-iauditor',
    titulo: 'Leitor de Iauditor',
    subtitulo: 'Área reservada para leitura, conferência e apoio ao uso de arquivos do Iauditor.',
    etiqueta: 'Ferramenta operacional',
    acaoPrincipal: 'Preparar leitor',
    descricao: 'Esta página foi criada como área-base para a futura integração do leitor de Iauditor. Aqui poderão entrar upload de arquivos, leitura automática, validações, conferência de campos e relatórios para os fiscais.',
    proximos: [
      ['Entrada de arquivos', 'Espaço reservado para upload ou leitura de documentos exportados do Iauditor.'],
      ['Validação automática', 'Área preparada para regras de conferência e inconsistências.'],
      ['Relatórios', 'Futuramente poderá gerar resumo, PDF ou planilha de conferência.']
    ]
  },
  databooks: {
    ativa: 'ferramenta-databooks',
    titulo: 'Data books',
    subtitulo: 'Área reservada para organização e geração de data books do controle de qualidade.',
    etiqueta: 'Documentação técnica',
    acaoPrincipal: 'Novo data book',
    descricao: 'Esta página foi criada como estrutura inicial para centralizar data books. Depois você poderá adicionar geração de documentos, filtros por lote, anexos, histórico e exportações.',
    proximos: [
      ['Cadastro de data books', 'Espaço para criar e acompanhar pacotes documentais.'],
      ['Vínculo com lotes', 'Preparado para relacionar data books a dormentes, subcomponentes ou fornecedores.'],
      ['Exportação', 'Área pronta para futuramente emitir PDF, Excel ou pacote de arquivos.']
    ]
  },
  flashcards: {
    ativa: 'ferramenta-flashcards',
    titulo: 'Flash-Cards',
    subtitulo: 'Área reservada para treinamento rápido, revisão e padronização de conhecimento dos fiscais.',
    etiqueta: 'Treinamento e padronização',
    acaoPrincipal: 'Novo flash-card',
    descricao: 'Esta página foi criada como base para flash-cards de inspeção, normas, critérios de aceitação, não conformidades e orientações rápidas para o time de campo.',
    proximos: [
      ['Cards de estudo', 'Espaço para perguntas e respostas rápidas.'],
      ['Categorias', 'Preparado para separar por concreto, subcomponentes, ensaios e auditoria.'],
      ['Controle de aprendizado', 'Futuramente poderá registrar acertos, revisões e dificuldade por usuário.']
    ]
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!await Auth.exigirLogin()) return;

  const tipo = document.body.dataset.ferramenta || 'iauditor';
  const cfg = FERRAMENTAS_CONFIG[tipo] || FERRAMENTAS_CONFIG.iauditor;

  App.montarLayout(cfg.ativa, cfg.titulo, cfg.subtitulo);
  App.acoesTopo(`
    <button class="btn btn-primario" type="button" onclick="Ferramentas.avisarEmDesenvolvimento('${cfg.titulo}')">${ICN.add}<span>${cfg.acaoPrincipal}</span></button>
    <button class="btn btn-secundario" type="button" onclick="Ferramentas.atualizar()">Atualizar</button>
  `);

  renderFerramenta(cfg);
});

function renderFerramenta(cfg) {
  const page = document.getElementById('paginaFerramenta');
  if (!page) return;

  page.innerHTML = `
    <section class="ferramenta-hero">
      <div class="card ferramenta-card-principal">
        <div>
          <span class="ferramenta-etiqueta">${U.esc(cfg.etiqueta)}</span>
          <h2>${U.esc(cfg.titulo)}</h2>
          <p>${U.esc(cfg.descricao)}</p>
        </div>
        <div class="aviso-info aviso" style="margin-top:22px;">
          <strong>Área criada e pronta para evolução.</strong><br>
          Por enquanto, esta tela funciona como placeholder seguro. Você poderá adicionar as regras, uploads, consultas e relatórios específicos depois.
        </div>
      </div>

      <div class="card">
        <div class="card-titulo">
          <span class="acento">Próximos módulos</span>
          <span class="card-sub">estrutura planejada</span>
        </div>
        <div class="ferramenta-lista">
          ${cfg.proximos.map(([titulo, texto]) => `
            <div class="item">
              <span class="marcador"></span>
              <div><strong>${U.esc(titulo)}</strong><span>${U.esc(texto)}</span></div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

const Ferramentas = {
  avisarEmDesenvolvimento(nome) {
    App.toast(`${nome}: funcionalidade reservada para a próxima etapa.`, 'aviso');
  },
  atualizar() {
    App.toast('Ferramenta atualizada.', 'sucesso');
  }
};
window.Ferramentas = Ferramentas;
