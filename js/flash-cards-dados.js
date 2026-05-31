/*
  Banco de conteúdo do mini curso.
  Para adicionar novas áreas, copie o objeto "dormente-concreto", altere id, area, document, flashcards e quiz.
  O site soma automaticamente as áreas quando o usuário escolhe "Todas as áreas".
*/
const TRAINING_DATA = [
  {
    id: 'dormente-concreto',
    area: 'Dormente de concreto',
    shortName: 'Dormentes',
    document: 'PO-SPE-160 R1',
    sourceLabel: 'Inspeção de Dormente de Concreto para Reparo e Refugo em Fábrica e Pátio',
    flashcards: [
      {
        category: 'Objetivo',
        front: 'Qual é o objetivo principal do procedimento PO-SPE-160?',
        back: 'Estabelecer critérios técnicos para inspeção de dormentes de concreto, indicando quando há possibilidade de reparo superficial e quando a peça deve ser rejeitada/refugada para preservar segurança, desempenho e conformidade.'
      },
      {
        category: 'Aplicação',
        front: 'Quem deve aplicar este procedimento na rotina da Rumo?',
        back: 'Colaboradores da Qualidade de Materiais, Operação de Via e Modernização que atuam com aplicação e manutenção de dormentes de concreto ao longo da ferrovia.'
      },
      {
        category: 'Ferramentas',
        front: 'Você vai iniciar a inspeção visual de dormentes novos. Quais instrumentos de medição precisa ter em mãos?',
        back: 'Trena, fissurômetro ou lupa para medir fissuras, e paquímetro. Esses instrumentos apoiam a medição de vazios, quebras, fissuras e dimensões relevantes.'
      },
      {
        category: 'Eixos de medição',
        front: 'Na metodologia do eixo, o que significam X, Y e Z?',
        back: 'X representa o comprimento, Y representa a altura e Z representa a profundidade. Essa padronização evita interpretações diferentes durante a medição.'
      },
      {
        category: 'Reparo',
        front: 'Um dormente é passível de reparo superficial. Que tipo de material deve ser priorizado?',
        back: 'Material adequado, preferencialmente à base cimentícia ou similar validado com o fornecedor e a Rumo, sem comprometer mecanicamente o elemento e sem gerar risco à durabilidade.'
      },
      {
        category: 'Reparo',
        front: 'Após aplicar material cimentício de reparo, qual cuidado evita fissuração e desplacamento prematuro?',
        back: 'Proteger o reparo jovem dos raios solares, garantir processo de cura e evitar movimentação imediata até o material adquirir resistência suficiente para transporte ou deslocamento.'
      },
      {
        category: 'Região do trilho',
        front: 'Na área de apoio do trilho, há até 3 pequenos vazios com profundidade ≤2 mm, comprimento ≤3 mm e largura ≤3 mm. Qual é a decisão?',
        back: 'Aceitar. Essas irregularidades estão dentro dos limites de aceitação para pequenos vazios na região de apoio do trilho.'
      },
      {
        category: 'Região do trilho',
        front: 'Na região do trilho, existem até 3 vazios com profundidade entre >3 e ≤5 mm, comprimento entre >4 e ≤10 mm e largura entre >4 e ≤10 mm. Qual é a decisão?',
        back: 'Reparar conforme o procedimento de reparo superficial. A ocorrência já passou do limite de aceitação, mas ainda está dentro da faixa reparável.'
      },
      {
        category: 'Região do trilho',
        front: 'Na região de apoio do trilho, uma única medida do vazio ultrapassou o limite de aceitação. O que fazer?',
        back: 'Aplicar a próxima condição. A nota das tabelas orienta que, se apenas uma das medidas for excedida, deve-se passar para a condição seguinte.'
      },
      {
        category: 'Região do trilho',
        front: 'Na área do trilho, o vazio tem profundidade >6 mm, comprimento >11 mm ou largura >11 mm. Qual é a classificação?',
        back: 'Grande vazio não reparável. O dormente deve ser refugado sem reparo.'
      },
      {
        category: 'Fora da região do trilho',
        front: 'Fora da região do trilho, microbolhas ou pequenos vazios superficiais são sempre motivo de rejeição?',
        back: 'Não. São toleráveis se não estiverem concentrados/coalescidos e se respeitarem os limites dimensionais estabelecidos.'
      },
      {
        category: 'Fora da região do trilho',
        front: 'Fora da região do trilho, há no máximo 3 vazios com profundidade, comprimento e altura ≤5 mm. Qual é a decisão?',
        back: 'Aceitar. Essa condição está dentro do limite de aceitação para vazios fora da região do trilho.'
      },
      {
        category: 'Fora da região do trilho',
        front: 'Fora da região do trilho, os vazios têm profundidade >6 e ≤10 mm, comprimento >6 e ≤20 mm, altura >6 e ≤20 mm, com no máximo 5 vazios. Qual é a decisão?',
        back: 'Reparar. Essa é a faixa reparável para vazios fora da região do trilho.'
      },
      {
        category: 'Fora da região do trilho',
        front: 'Qual gabarito deve ser usado para inspecionar vazios no concreto fora da região do trilho?',
        back: 'Um gabarito quadrado de 100 mm x 100 mm, usado para avaliar a distribuição e as dimensões dos vazios na área inspecionada.'
      },
      {
        category: 'Bolhas alveoladas',
        front: 'O fiscal encontra grandes vazios do tipo bolhas alveoladas em dormente protendido. Pode reparar?',
        back: 'Não. Grandes vazios/bolhas alveoladas não são permitidos, inclusive em peças já reparadas. A peça deve ser rejeitada/refugada por risco à integridade estrutural e durabilidade.'
      },
      {
        category: 'Testeira',
        front: 'Na testeira, há exposição do fio da armadura por vazio com até 30 mm de profundidade. Qual é a decisão?',
        back: 'É tolerável para reparo. Acima disso, a condição muda para refugo conforme o limite de exposição do fio.'
      },
      {
        category: 'Testeira',
        front: 'Na testeira, há exposição de um fio da armadura igual ou superior a 31 mm. Qual é a decisão?',
        back: 'Refugar o dormente. Essa exposição ultrapassa o limite tolerável para reparo em vazios na testeira.'
      },
      {
        category: 'Testeira',
        front: 'Há grande vazio na testeira sem aço exposto, com profundidade de até 50 mm. Qual é a decisão?',
        back: 'Reparar, desde que esteja dentro dos demais critérios aplicáveis. Vazio na testeira sem aço exposto acima de 51 mm deve ser refugado.'
      },
      {
        category: 'Testeira',
        front: 'O vazio da testeira se propaga para a lateral. Até que limite a peça ainda pode receber reparo?',
        back: 'Até 50 mm de continuidade/propagação é tolerável para reparo. Passando de 51 mm, o dormente deve ser refugado.'
      },
      {
        category: 'Quebras laterais/superiores',
        front: 'Quebra lateral ou superior fora da região do trilho, sem aço exposto, com profundidade ≤10 mm, comprimento ≤49 mm e altura ≤29 mm. Qual é a decisão?',
        back: 'Aceitar. A ocorrência está dentro dos limites de aceitação para quebras laterais e superiores sem aço exposto.'
      },
      {
        category: 'Quebras laterais/superiores',
        front: 'Quebra lateral/superior sem aço exposto com profundidade >10 e ≤20 mm, comprimento >50 e ≤200 mm, altura >30 e ≤150 mm. Qual é a decisão?',
        back: 'Reparar. A ocorrência está na faixa reparável para quebras laterais e superiores fora da região do trilho.'
      },
      {
        category: 'Aço exposto',
        front: 'Uma quebra, mesmo dentro de dimensão aparentemente pequena, expôs aço da armadura. O que deve ser feito?',
        back: 'Refugar o dormente. O procedimento registra que, caso a quebra exponha o aço da armadura, o dormente será refugado.'
      },
      {
        category: 'Quebra na testeira',
        front: 'Quebra na testeira sem aço exposto com profundidade >11 e ≤50 mm, comprimento >50 e ≤100 mm, altura >30 e ≤100 mm. Qual é a decisão?',
        back: 'Reparar. Essa é a faixa de reparo para quebras na testeira sem exposição de armadura.'
      },
      {
        category: 'Quebra na testeira',
        front: 'A quebra na testeira, sem aço exposto, aparece junto com quebra lateral. Quando ainda pode ser reparada?',
        back: 'Quando a quebra lateral associada estiver até no máximo 100 mm de comprimento/altura. Acima desse limite, a peça deve ser refugada.'
      },
      {
        category: 'Testeira com aço',
        front: 'Quebra na testeira com exposição do fio de protensão pode receber reparo?',
        back: 'Não. O procedimento não permite reparo para quebra na testeira com aço exposto. Para segregação futura C2, considera-se exposição até 20 mm; igual ou superior a 21 mm é refugo sem C2.'
      },
      {
        category: 'Fissuras',
        front: 'Há fissura no concreto ao redor da ombreira. Qual é a decisão?',
        back: 'Refugar o dormente. Fissura ao redor da ombreira não permite reparo.'
      },
      {
        category: 'Fissuras',
        front: 'A fissura na testeira passa pelos fios de protensão, independentemente da espessura e do comprimento. Qual é a decisão?',
        back: 'Não é permitido reparo. O dormente deve ser refugado.'
      },
      {
        category: 'Fissura longitudinal',
        front: 'Fissura longitudinal lateral sem atingir o aço: espessura ≤0,10 mm e comprimento ≤10 mm. Qual é a decisão?',
        back: 'Aceitar. Está dentro do limite de aceitação da tabela de fissuras longitudinais sem atingir o aço.'
      },
      {
        category: 'Fissura longitudinal',
        front: 'Fissura longitudinal lateral sem atingir o aço: espessura >0,15 e ≤0,50 mm, comprimento >11 e ≤100 mm. Qual é a decisão?',
        back: 'Reparar conforme item 6.3. A fissura não atinge o aço e está na faixa reparável.'
      },
      {
        category: 'Fissura longitudinal',
        front: 'Fissura longitudinal lateral sem atingir o aço com espessura ≥0,55 mm ou comprimento >101 mm. Qual é a decisão?',
        back: 'Refugar imediatamente, pois excede o limite de reparo para fissuras longitudinais sem atingir aço.'
      },
      {
        category: 'Fissura transversal/autógena',
        front: 'No lote há fissura transversal de retração/autógena com espessura >0,55 mm. Qual é a decisão?',
        back: 'Refugar imediatamente o dormente com essa fissura.'
      },
      {
        category: 'Fissura transversal/autógena',
        front: 'A fissura transversal/autógena tem espessura ≤0,50 mm. Qual é o procedimento de verificação?',
        back: 'Separar 2 dormentes com as fissuras para ensaios de momentos fletores positivo/negativo no centro e na região do trilho. A fissura não pode se propagar em espessura ou comprimento; se não aprovar, refugiar.'
      },
      {
        category: 'Fios de protensão',
        front: 'Quais tolerâncias de posicionamento dos fios de protensão devem ser respeitadas?',
        back: 'Posicionamento vertical das armaduras ativas: ±3 mm. Posicionamento horizontal: ±6 mm.'
      },
      {
        category: 'Fios de protensão',
        front: 'Um fio de protensão está fora da tolerância vertical ou horizontal do projeto. O dormente pode ser liberado?',
        back: 'Não. Qualquer fio fora dos limites especificados gera refugo, sem permissão de utilização ou liberação.'
      },
      {
        category: 'Palmilha USP',
        front: 'Qual distância a palmilha USP deve manter dos bordos do dormente na lateral e na testeira?',
        back: 'De 5 mm a 25 mm dos bordos, para evitar que a palmilha seja arrancada durante a socaria do lastro.'
      },
      {
        category: 'Palmilha USP',
        front: 'A palmilha USP ficou com distância de bordo menor que 5 mm. O que fazer?',
        back: 'Realizar corte da palmilha USP para correção, conforme indicado no procedimento.'
      },
      {
        category: 'Palmilha USP',
        front: 'A palmilha USP ultrapassou o bordo do dormente. Qual é a destinação?',
        back: 'Separar para futuro dormente C2. Dormentes fora das medidas descritas devem ser segregados para essa destinação.'
      },
      {
        category: 'Palmilha USP',
        front: 'Qual é o adensamento mínimo do elastômero da palmilha USP no concreto fresco?',
        back: 'Além da camada de conexão, deve haver no mínimo 2 mm do elastômero adensado.'
      },
      {
        category: 'Reparo USP',
        front: 'A USP foi danificada no manuseio. Qual é a primeira etapa do reparo?',
        back: 'Remover completamente a palmilha USP danificada. Se a remoção causar dano no dormente, tratar a avaria conforme os critérios do procedimento.'
      },
      {
        category: 'Reparo USP',
        front: 'Após remover a USP danificada, como preparar a superfície para receber o novo elemento?',
        back: 'Realizar lixamento da área para garantir superfície regular, nivelada e adequada à instalação da nova palmilha.'
      },
      {
        category: 'Reparo USP',
        front: 'Depois da limpeza e aplicação do agente de aderência, quando o dormente pode ser liberado?',
        back: 'Após a secagem completa do material aplicado, com inspeção da equipe de Qualidade da Rumo. Quando necessário, realizar ensaio de arrancamento para verificar a eficiência do reparo.'
      }
    ],
    quiz: [
      {
        question: 'Quais instrumentos são listados para a inspeção de dormentes de concreto?',
        options: ['Trena, fissurômetro ou lupa para medir fissuras, e paquímetro', 'Prumo, nível óptico, termômetro e martelete', 'Tacômetro, goniômetro, dinamômetro e nível laser', 'Apenas inspeção visual, sem instrumento'],
        answer: 0,
        explanation: 'O procedimento lista trena, fissurômetro ou lupa para medir fissuras, e paquímetro.'
      },
      {
        question: 'Na metodologia de eixos do procedimento, o eixo Z corresponde a:',
        options: ['Comprimento', 'Altura', 'Profundidade', 'Largura do boleto'],
        answer: 2,
        explanation: 'X é comprimento, Y é altura e Z é profundidade.'
      },
      {
        question: 'Na área de apoio do trilho, um vazio com profundidade entre >3 e ≤5 mm, comprimento entre >4 e ≤10 mm e largura entre >4 e ≤10 mm, com no máximo 3 vazios, deve ser:',
        options: ['Aceito sem ação', 'Reparado', 'Liberado apenas com pintura', 'Refugado sempre, sem avaliar dimensão'],
        answer: 1,
        explanation: 'Essa é a faixa indicada para reparo em vazios na região de apoio do trilho.'
      },
      {
        question: 'Grandes vazios do tipo bolhas alveoladas em dormente protendido devem ser:',
        options: ['Aceitos quando estiverem fora da região do trilho', 'Reparados com qualquer argamassa disponível', 'Rejeitados/refugados, inclusive em peças reparadas', 'Aprovados se a superfície for lixada'],
        answer: 2,
        explanation: 'Bolhas alveoladas não são permitidas, pois podem comprometer integridade estrutural e durabilidade.'
      },
      {
        question: 'Na testeira, a exposição de um fio da armadura por vazio com profundidade igual ou superior a 31 mm leva a qual decisão?',
        options: ['Aceitação', 'Reparo obrigatório', 'Refugo do dormente', 'Apenas registro fotográfico'],
        answer: 2,
        explanation: 'Exposição igual ou superior a 31 mm é motivo de refugo.'
      },
      {
        question: 'Caso uma quebra exponha aço da armadura, a decisão correta é:',
        options: ['Reparar e liberar', 'Refugar o dormente', 'Cortar apenas a área quebrada', 'Aguardar 24 horas e reinspecionar'],
        answer: 1,
        explanation: 'A nota do procedimento estabelece que, se a quebra expõe o aço da armadura, o dormente será refugado.'
      },
      {
        question: 'Fissura no concreto ao redor da ombreira deve ser tratada como:',
        options: ['Ocorrência aceitável', 'Reparo superficial simples', 'Refugo, sem permissão de reparo', 'Apenas C2 automático'],
        answer: 2,
        explanation: 'Fissura ao redor da ombreira não permite reparo; o dormente deve ser refugado.'
      },
      {
        question: 'As tolerâncias gerais de posicionamento dos fios de protensão são:',
        options: ['±1 mm vertical e ±1 mm horizontal', '±3 mm vertical e ±6 mm horizontal', '±6 mm vertical e ±3 mm horizontal', '±10 mm vertical e ±10 mm horizontal'],
        answer: 1,
        explanation: 'O procedimento define ±3 mm para posicionamento vertical e ±6 mm para horizontal.'
      },
      {
        question: 'A palmilha USP deve ficar a que distância dos bordos do dormente?',
        options: ['0 a 5 mm', '5 a 25 mm', '25 a 50 mm', 'Acima de 51 mm'],
        answer: 1,
        explanation: 'A distância especificada é de 5 mm a 25 mm dos bordos na lateral e testeira.'
      },
      {
        question: 'No reparo de USP danificada no manuseio, qual sequência resume corretamente o procedimento?',
        options: ['Pintar a USP, movimentar o dormente e liberar', 'Remover a USP danificada, lixar/preparar a superfície, restaurar quando aplicável, aplicar agente de aderência, instalar nova USP e inspecionar após secagem', 'Cortar o dormente, aplicar óleo e colar a mesma USP', 'Somente fotografar e arquivar'],
        answer: 1,
        explanation: 'Essa sequência reúne as etapas descritas para o reparo de USP danificada no manuseio.'
      }
    ]
  },
{
    "id": "brita-lastro",
    "area": "Brita para lastro",
    "shortName": "Brita",
    "document": "MAN-VP-L-MTE-LT-0003-03 + MAN-VP-T-ETM-ES-0006-05 R5",
    "sourceLabel": "Cartilha de Inspeção de Brita para Lastro em Campo e Especificação Técnica de Pedra Britada para Lastro Ferroviário",
    "flashcards": [
        {
            "category": "Finalidade",
            "front": "Qual é a finalidade da cartilha de inspeção de brita para lastro em campo?",
            "back": "Auxiliar os envolvidos no recebimento e no controle de qualidade da brita para lastro por meio de inspeção visual de aspecto, forma e dimensão e, quando necessário, por ensaios específicos de forma e granulometria."
        },
        {
            "category": "Material",
            "front": "O que é a pedra britada para lastro ferroviário na especificação técnica da Rumo?",
            "back": "É a pedra britada destinada ao uso como lastro ferroviário na Rumo, produzida a partir de rocha dura e sã, com características petrográficas adequadas."
        },
        {
            "category": "Prioridade normativa",
            "front": "Se houver diferença entre a especificação da Rumo e uma norma ABNT, qual critério prevalece?",
            "back": "Quando a especificação da Rumo for mais restritiva que a norma ABNT, prevalece a especificação da Rumo."
        },
        {
            "category": "Contaminação",
            "front": "Durante o recebimento, o fiscal identifica argila, areia, matéria orgânica ou outros finos misturados à brita. Qual é a ação?",
            "back": "Não aceitar o material. A presença de materiais que não sejam fragmentos de rocha dura e sã caracteriza lastro contaminado."
        },
        {
            "category": "Contaminação",
            "front": "Qualquer material contaminando a pedra britada é encontrado antes do carregamento em vagões. O que deve acontecer?",
            "back": "O material deve ser recusado e o fornecedor deve ser comunicado para substituição antes do carregamento, quando aplicável."
        },
        {
            "category": "Forma da brita",
            "front": "O lote apresenta muitas partículas lamelares ou alongadas. Qual é o limite visual que orienta a recusa?",
            "back": "Se a estimativa de partículas lamelares/não cúbicas no lote estiver acima de 15%, o fiscal deve recusar o lote por motivo de contaminação."
        },
        {
            "category": "Forma da brita",
            "front": "Na inspeção visual, a brita parece não cúbica, mas o fiscal não tem certeza do percentual. O que deve ser feito?",
            "back": "A incidência acima do admissível deve ser comunicada imediatamente ao fornecedor; se necessário, deve ser solicitado exame de forma em laboratório."
        },
        {
            "category": "Forma da brita",
            "front": "Qual forma média das partículas é exigida para o lastro ferroviário?",
            "back": "A forma média deve ser cúbica, conforme o ensaio pelo método do paquímetro ou calibre indicado na especificação."
        },
        {
            "category": "Forma da brita",
            "front": "Pela Tabela 2 da ETM, qual é o percentual máximo de partículas não cúbicas para granito?",
            "back": "Para granito, o máximo é 15% de partículas não cúbicas."
        },
        {
            "category": "Forma da brita",
            "front": "Pela Tabela 2 da ETM, qual é o percentual máximo de partículas não cúbicas para basalto?",
            "back": "Para basalto, o máximo é 17% de partículas não cúbicas."
        },
        {
            "category": "Forma da brita",
            "front": "Pela Tabela 2 da ETM, qual é o percentual máximo de partículas não cúbicas para calcário calcítico, calcário dolomítico e outras litologias?",
            "back": "O máximo é 15% de partículas não cúbicas para calcário calcítico, calcário dolomítico e outras litologias."
        },
        {
            "category": "Granulometria",
            "front": "A inspeção visual aponta quantidade significativa de fragmentos fora da faixa granulométrica. Qual é a ação de campo?",
            "back": "Não aceitar de imediato e realizar ensaio de granulometria quando houver peneira e balança disponíveis; na falta desses recursos, solicitar os devidos ensaios ao fornecedor."
        },
        {
            "category": "Granulometria",
            "front": "Qual é a faixa dimensional geral da brita para lastro indicada na cartilha de campo?",
            "back": "A faixa de referência é entre 12,7 mm e 63,5 mm. Fragmentos em quantidade significativa fora dessa faixa indicam granulometria fora do padrão."
        },
        {
            "category": "Granulometria",
            "front": "Por que excesso de finos no lastro é problema para a via?",
            "back": "Quanto maior a quantidade de finos, menor a permeabilidade e maior a rigidez do lastro, prejudicando o desempenho e aumentando a necessidade de intervenção."
        },
        {
            "category": "Granulometria R5",
            "front": "Na especificação MAN-VP-T-ETM-ES-0006-05 R5, a graduação da pedra britada é limitada entre quais malhas?",
            "back": "Entre 12,7 mm (1/2”) e 63,5 mm (2.1/2”), com tolerância máxima de 5% além da menor dimensão, condicionada aos percentuais indicados na curva granulométrica."
        },
        {
            "category": "Granulometria R5",
            "front": "No Plano 24 da AREMA, qual percentual deve reter na peneira de 3 polegadas / 76,2 mm?",
            "back": "0%. Não deve haver retenção nessa malha conforme a Tabela 1 da especificação."
        },
        {
            "category": "Granulometria R5",
            "front": "No Plano 24 da AREMA, qual percentual deve reter na peneira de 2.1/2 polegadas / 63,5 mm?",
            "back": "De 0% a 10% de retenção."
        },
        {
            "category": "Granulometria R5",
            "front": "No Plano 24 da AREMA, qual percentual deve reter na peneira de 1.1/2 polegadas / 38,1 mm?",
            "back": "De 40% a 75% de retenção."
        },
        {
            "category": "Granulometria R5",
            "front": "No Plano 24 da AREMA, qual percentual deve reter na peneira de 3/4 polegada / 19,1 mm?",
            "back": "De 90% a 100% de retenção."
        },
        {
            "category": "Granulometria R5",
            "front": "No Plano 24 da AREMA, qual percentual deve reter na peneira de 1/2 polegada / 12,7 mm?",
            "back": "De 95% a 100% de retenção."
        },
        {
            "category": "Amostragem de campo",
            "front": "Para o ensaio de granulometria em campo, onde a amostra deve ser coletada na pilha e qual massa é necessária?",
            "back": "A brita deve ser coletada em 3 pontos da pilha: topo, meio e base. A cartilha indica necessidade de 35 kg."
        },
        {
            "category": "Amostragem de campo",
            "front": "Após coletar a brita para ensaio de granulometria, como reduzir a amostra pelo método de quarteamento?",
            "back": "Em superfície rígida, limpa e plana, achatar o cone, dividir ao meio, dividir novamente e eliminar duas partes em sentido diagonal."
        },
        {
            "category": "Ensaio de granulometria",
            "front": "Qual é o primeiro passo do ensaio de granulometria após preparar a amostra?",
            "back": "Pesar a amostra na balança."
        },
        {
            "category": "Ensaio de granulometria",
            "front": "Como as peneiras devem ser montadas no ensaio de granulometria?",
            "back": "As peneiras devem estar previamente limpas e encaixadas em um único conjunto, com abertura de malha em ordem crescente da base para o topo."
        },
        {
            "category": "Ensaio de granulometria",
            "front": "Depois de montar as peneiras, qual é a sequência básica do ensaio?",
            "back": "Colocar a amostra sobre a peneira superior, promover agitação mecânica por tempo razoável, remover o material retido para bandejas identificadas e limpar as peneiras."
        },
        {
            "category": "Ensaio de granulometria",
            "front": "Ao escovar a peneira, como classificar o material removido pelo lado interno e pela parte inferior?",
            "back": "O material removido pelo lado interno é considerado retido e deve ser juntado à bandeja. O material desprendido na parte inferior é considerado passante."
        },
        {
            "category": "Ensaio de granulometria",
            "front": "Após separar o material nas peneiras, quais cálculos devem ser feitos?",
            "back": "Pesar o material retido em cada peneira e no fundo do conjunto, descontar o peso da peneira, calcular as porcentagens médias, retida e acumulada, e comparar com a especificação técnica da Rumo."
        },
        {
            "category": "Ensaio de forma",
            "front": "Quantos fragmentos são usados como referência no ensaio de forma da cartilha?",
            "back": "O ensaio trabalha com 100 fragmentos, distribuídos por fração conforme a equação Ni = (100 / soma das frações retidas) × Fi."
        },
        {
            "category": "Ensaio de forma",
            "front": "No ensaio de forma, o que representa Ni na equação de preparação da amostra?",
            "back": "Ni é a quantidade de fragmentos da fração i que será medida no ensaio."
        },
        {
            "category": "Ensaio de forma",
            "front": "Quais dimensões devem ser medidas em cada fragmento no ensaio de forma?",
            "back": "Devem ser medidas as dimensões a, b e c, com paquímetro, em centímetros, considerando um paralelogramo em que o fragmento possa ser circunscrito."
        },
        {
            "category": "Ensaio de forma",
            "front": "No ensaio de forma, o que representa a dimensão 'a'?",
            "back": "A dimensão 'a' é a maior distância entre dois pontos A e B do corpo de prova."
        },
        {
            "category": "Ensaio de forma",
            "front": "No ensaio de forma, o que representa a dimensão 'b'?",
            "back": "A dimensão 'b' é a distância média: a distância entre duas retas paralelas à reta AB, tangenciando os pontos C e D do fragmento."
        },
        {
            "category": "Ensaio de forma",
            "front": "No ensaio de forma, o que representa a dimensão 'c'?",
            "back": "A dimensão 'c' é a menor distância: a maior distância entre dois planos paralelos às retas AB e CD que tangenciem a superfície do corpo de prova."
        },
        {
            "category": "Classificação da forma",
            "front": "Como classificar um fragmento com b/a ≥ 0,5 e c/b ≥ 0,5?",
            "back": "Classificação cúbica."
        },
        {
            "category": "Classificação da forma",
            "front": "Como classificar um fragmento com b/a < 0,5 e c/b ≥ 0,5?",
            "back": "Classificação alongada."
        },
        {
            "category": "Classificação da forma",
            "front": "Como classificar um fragmento com b/a ≥ 0,5 e c/b < 0,5?",
            "back": "Classificação lamelar."
        },
        {
            "category": "Classificação da forma",
            "front": "Como classificar um fragmento com b/a < 0,5 e c/b < 0,5?",
            "back": "Classificação alongada-lamelar."
        },
        {
            "category": "Classificação da forma",
            "front": "Depois de medir a, b e c dos fragmentos, o que deve ser calculado?",
            "back": "Calcular b/a e c/b, arredondar ao décimo, classificar cada fragmento, calcular as médias e contar os indivíduos cúbicos e não cúbicos para obter suas porcentagens."
        },
        {
            "category": "Resistência ao desgaste",
            "front": "Qual ensaio avalia a resistência ao desgaste da pedra britada para lastro?",
            "back": "O ensaio de abrasão Los Angeles, graduação E ou F, conforme a norma aplicável."
        },
        {
            "category": "Resistência ao desgaste",
            "front": "Qual é o limite máximo de abrasão Los Angeles para granito?",
            "back": "Para granito, a redução de peso máxima admitida é 35%."
        },
        {
            "category": "Resistência ao desgaste",
            "front": "Qual é o limite máximo de abrasão Los Angeles para basalto, calcários e outras litologias?",
            "back": "Para basalto, calcário calcítico, calcário dolomítico e outras litologias, a redução de peso máxima admitida é 30%."
        },
        {
            "category": "Propriedades físicas",
            "front": "Qual é o limite máximo de material pulverulento na pedra britada para lastro?",
            "back": "O limite máximo é 1%, conforme a Tabela 2 da especificação técnica."
        },
        {
            "category": "Propriedades físicas",
            "front": "Qual é o limite máximo de torrões de argila na pedra britada para lastro?",
            "back": "O limite máximo é 0,5%."
        },
        {
            "category": "Propriedades físicas",
            "front": "Qual é a porosidade aparente máxima admitida para as litologias da Tabela 2?",
            "back": "A porosidade aparente máxima é 2%."
        },
        {
            "category": "Propriedades físicas",
            "front": "Qual é a absorção de água máxima para granito e basalto?",
            "back": "Para granito e basalto, a absorção máxima de água é 1%."
        },
        {
            "category": "Propriedades físicas",
            "front": "Qual é a absorção de água máxima para calcários e outras litologias?",
            "back": "Para calcário calcítico, calcário dolomítico e outras litologias, a absorção máxima é 2%."
        },
        {
            "category": "Propriedades físicas",
            "front": "Qual é o limite mínimo de massa unitária no estado solto?",
            "back": "O limite mínimo é 1250 kg/m³."
        },
        {
            "category": "Propriedades físicas",
            "front": "Qual é a massa específica aparente mínima para basalto?",
            "back": "Para basalto, a massa específica aparente mínima é 2700 kg/m³."
        },
        {
            "category": "Propriedades físicas",
            "front": "Qual é a massa específica aparente mínima para granito e calcário calcítico?",
            "back": "Para granito e calcário calcítico, a massa específica aparente mínima é 2600 kg/m³."
        },
        {
            "category": "Propriedades físicas",
            "front": "Qual é a massa específica aparente mínima para calcário dolomítico e outras litologias?",
            "back": "Calcário dolomítico: 2650 kg/m³. Outras litologias: 2500 kg/m³."
        },
        {
            "category": "Qualificação do fornecedor",
            "front": "Como a qualidade da pedra britada fornecida deve ser comprovada na qualificação?",
            "back": "Por laudo de laboratório terceiro, definido em comum acordo com a Rumo, comprovando atendimento às normas e aos ensaios exigidos."
        },
        {
            "category": "Qualificação do fornecedor",
            "front": "Na amostragem para qualificação do fornecedor, quantos pontos do depósito devem ser amostrados e qual massa mínima por ponto?",
            "back": "Devem ser retiradas amostras em 4 pontos distintos do depósito, abrangendo parte inferior e superior da pilha, com no mínimo 80 kg cada."
        },
        {
            "category": "Qualificação do fornecedor",
            "front": "Após misturar as quatro amostras de 80 kg no processo de qualificação, qual quantidade mínima final deve ser retirada?",
            "back": "Após formar o tronco de cone, dividir, rejeitar duas porções opostas e misturar as restantes, deve-se retirar uma quantidade mínima de 60 kg."
        },
        {
            "category": "Validade dos ensaios",
            "front": "Quais ensaios têm validade de um ano segundo a especificação?",
            "back": "Forma média das partículas, partículas não cúbicas, material pulverulento e granulometria. A data base é a emissão do relatório pelo laboratório."
        },
        {
            "category": "Validade dos ensaios",
            "front": "Qual é a validade dos demais ensaios que não são anuais?",
            "back": "Os demais ensaios têm validade de três anos, considerando como data base a emissão do relatório pelo laboratório."
        },
        {
            "category": "Rastreabilidade",
            "front": "Se houver mudança no veio da rocha usada para fornecimento, qual ação é necessária?",
            "back": "A Engenharia de Desenvolvimento Ferroviário da Rumo deve ser comunicada e novos ensaios devem ser realizados para qualificação do material."
        },
        {
            "category": "Homologação",
            "front": "Para vender pedra para lastro ferroviário à Rumo, o fornecedor precisa de qual etapa técnica?",
            "back": "Precisa solicitar homologação técnica do material pela Engenharia de Via Permanente, via portal indicado pela área de Suprimentos."
        },
        {
            "category": "Homologação",
            "front": "Que requisito os laboratórios dos laudos de homologação devem cumprir?",
            "back": "Os laudos devem ser realizados em laboratórios com acreditação pelo INMETRO."
        },
        {
            "category": "Homologação",
            "front": "Qual é a validade da homologação técnica do fornecedor?",
            "back": "A homologação técnica tem validade de um ano a partir da data de homologação, sendo ideal iniciar a renovação antes do vencimento."
        },
        {
            "category": "Inspeção periódica",
            "front": "A cada quanto volume o fornecedor deve retirar amostra padrão para ensaio de granulometria?",
            "back": "Para cada 1.000 m³ de pedra britada para lastro ferroviário a ser entregue à Rumo."
        },
        {
            "category": "Inspeção periódica",
            "front": "Se a curva granulométrica do lote de 1.000 m³ estiver fora dos limites, o que deve ser feito?",
            "back": "O fornecedor deve tomar providências para adequação do volume e, depois, retirar nova amostra do mesmo lote e realizar novo ensaio de granulometria."
        },
        {
            "category": "Inspeção periódica",
            "front": "Quais informações mínimas devem ser arquivadas com as curvas granulométricas na pedreira?",
            "back": "Data da britagem e responsável pela elaboração do laudo; uma cópia também deve ser enviada à Rumo para arquivamento e rastreabilidade."
        },
        {
            "category": "Inspeção Rumo",
            "front": "Onde a Rumo pode realizar inspeções periódicas de qualidade do material?",
            "back": "Nas dependências do fornecedor antes da entrega ou nos locais de descarga/armazenamento após a entrega do material."
        },
        {
            "category": "Carregamento",
            "front": "Quando o fornecedor é responsável pelo carregamento dos vagões, o que ele deve garantir?",
            "back": "Deve promover nivelamento e espalhamento uniforme do material, controlando volume e balanceamento de carga no veículo ferroviário."
        },
        {
            "category": "Carregamento",
            "front": "Os vagões podem ser carregados acima da capacidade nominal se a brita estiver bem distribuída?",
            "back": "Não. Os vagões devem ser carregados no limite da capacidade nominal; carregamento irregular gera notificação ao fornecedor quando ele for responsável."
        },
        {
            "category": "Carga e descarga",
            "front": "Segundo a cartilha, como a carga deve estar no vagão?",
            "back": "Distribuída de forma balanceada e limitada ao peso bruto máximo do vagão, respeitando os procedimentos da especificação RUMO ENG-ETS-D006."
        },
        {
            "category": "Aceitação",
            "front": "Quando a pedra britada para lastro ferroviário será aceita pela Rumo?",
            "back": "Após homologação total do fornecedor e quando as amostras retiradas atenderem aos requisitos técnicos, de acondicionamento e de ensaios da especificação."
        },
        {
            "category": "Não conformidade",
            "front": "O fiscal identifica não conformidade no material inspecionado. Qual processo deve ser aberto?",
            "back": "Deve ser aberta uma ocorrência, seguindo o processo estabelecido pela área de Qualidade da Rumo e as tratativas do acordo comercial entre as partes."
        },
        {
            "category": "Meio ambiente",
            "front": "Qual condição ambiental é exigida para fornecimento de pedra para lastro ferroviário?",
            "back": "Os fornecedores devem obter as aprovações necessárias determinadas pela área de Meio Ambiente da Rumo."
        },
        {
            "category": "Segurança",
            "front": "Quais EPIs são citados para pessoas envolvidas na entrega e fornecimento de pedra?",
            "back": "Luvas, capacete, óculos de proteção, calçado de segurança, perneira, colete refletivo e protetor auricular quando necessário. Motoristas e ajudantes também devem usar os EPIs aplicáveis."
        }
    ],
    "quiz": [
        {
            "question": "Durante o recebimento, o fiscal encontra argila e matéria orgânica misturadas à brita. Qual decisão está correta?",
            "options": [
                "Aceitar se a maioria da pilha estiver limpa",
                "Não aceitar, pois caracteriza lastro contaminado",
                "Aceitar e solicitar ensaio somente no mês seguinte",
                "Apenas nivelar a pilha e liberar"
            ],
            "answer": 1,
            "explanation": "Materiais como argila, areia, matéria orgânica e finos que não sejam fragmentos de rocha dura e sã caracterizam contaminação e levam à não aceitação."
        },
        {
            "question": "Na inspeção visual, a estimativa de partículas lamelares no lote está acima de 15%. O fiscal deve:",
            "options": [
                "Recusar o lote por contaminação",
                "Aceitar e registrar como observação",
                "Liberar somente para dormente de aço",
                "Pedir apenas o espalhamento uniforme no vagão"
            ],
            "answer": 0,
            "explanation": "A especificação orienta recusa do lote quando a estimativa de partículas lamelares feita pela fiscalização estiver acima de 15%."
        },
        {
            "question": "Qual é a faixa dimensional geral da brita para lastro indicada nos documentos?",
            "options": [
                "5 mm a 25 mm",
                "10 mm a 40 mm",
                "12,7 mm a 63,5 mm",
                "19,1 mm a 76,2 mm sem limite inferior"
            ],
            "answer": 2,
            "explanation": "A faixa de referência é de 12,7 mm a 63,5 mm."
        },
        {
            "question": "No Plano 24 da AREMA da ETM R5, qual retenção é esperada na peneira de 1.1/2 polegadas / 38,1 mm?",
            "options": [
                "0%",
                "0% a 10%",
                "40% a 75%",
                "95% a 100%"
            ],
            "answer": 2,
            "explanation": "A Tabela 1 da ETM R5 indica retenção de 40% a 75% na malha de 38,1 mm."
        },
        {
            "question": "Para o ensaio de granulometria em campo, a cartilha orienta coletar a brita em:",
            "options": [
                "Apenas no topo da pilha, com 10 kg",
                "Topo, meio e base da pilha, com 35 kg",
                "Quatro vagões diferentes, com 80 kg cada",
                "Apenas no fundo do conjunto de peneiras"
            ],
            "answer": 1,
            "explanation": "A cartilha orienta coletar em três pontos da pilha: topo, meio e base, com necessidade de 35 kg."
        },
        {
            "question": "No ensaio de forma, um fragmento com b/a < 0,5 e c/b ≥ 0,5 é classificado como:",
            "options": [
                "Cúbico",
                "Alongado",
                "Lamelar",
                "Alongado-lamelar"
            ],
            "answer": 1,
            "explanation": "Pela tabela de classificação da forma, b/a < 0,5 e c/b ≥ 0,5 indica fragmento alongado."
        },
        {
            "question": "Qual propriedade deve ser verificada pelo ensaio de abrasão Los Angeles?",
            "options": [
                "Resistência ao desgaste",
                "Absorção de água",
                "Massa unitária no estado solto",
                "Teor de argila"
            ],
            "answer": 0,
            "explanation": "O ensaio de abrasão Los Angeles avalia a resistência ao desgaste do material rochoso."
        },
        {
            "question": "Na qualificação do fornecedor, os ensaios de forma, partículas não cúbicas, material pulverulento e granulometria têm validade de:",
            "options": [
                "3 meses",
                "6 meses",
                "1 ano",
                "3 anos"
            ],
            "answer": 2,
            "explanation": "Esses ensaios têm validade de um ano, contando da emissão do relatório pelo laboratório."
        },
        {
            "question": "Para cada 1.000 m³ de pedra britada a entregar para a Rumo, o fornecedor deve:",
            "options": [
                "Retirar amostra padrão e submetê-la ao ensaio de granulometria",
                "Substituir todo o lote automaticamente",
                "Fazer somente inspeção fotográfica",
                "Enviar apenas a nota fiscal ao fiscal"
            ],
            "answer": 0,
            "explanation": "A especificação exige amostra padrão e ensaio de granulometria para cada 1.000 m³."
        },
        {
            "question": "Quando o fornecedor é responsável pelo carregamento dos vagões, qual prática é obrigatória?",
            "options": [
                "Carregar acima da capacidade nominal para otimizar viagem",
                "Nivelar e espalhar uniformemente o material no vagão",
                "Concentrar a carga no centro para facilitar descarga",
                "Molhar a brita para aumentar a massa"
            ],
            "answer": 1,
            "explanation": "O fornecedor deve nivelar e espalhar uniformemente o material, garantindo controle de volume e balanceamento de carga."
        }
    ]
},
  {
  "id": "dormente-madeira",
  "area": "Dormente de madeira",
  "shortName": "Madeira",
  "document": "MAN DM T MTE DM 0001 + ENG-DSV-VP-ETM-D006/06.00",
  "sourceLabel": "Cartilha de Inspeção de Dormentes em Campo e Especificação Técnica de Material - Dormente de Madeira",
  "flashcards": [
    {
      "category": "Objetivo",
      "front": "Qual é a finalidade da Cartilha de Inspeção de Dormentes em Campo?",
      "back": "Auxiliar no recebimento de dormentes de madeira, orientar a inspeção visual das peças, indicar informações a coletar e ações quando houver não atendimento à cartilha ou às especificações aplicáveis."
    },
    {
      "category": "Tipos de dormente",
      "front": "Quais são os três tipos de dormentes de madeira citados para uso pela empresa?",
      "back": "Eucalipto prismático com 4 faces serradas, eucalipto semi-roliço e madeira de lei com 4 faces serradas."
    },
    {
      "category": "Tipos de dormente",
      "front": "Um fornecedor entrega dormente de eucalipto semi-roliço para uma localidade fora da métrica norte. O fiscal deve aceitar?",
      "back": "Não. O eucalipto semi-roliço é específico para a métrica norte; as demais localidades devem receber dormentes prismáticos com as 4 faces serradas."
    },
    {
      "category": "Recebimento em campo",
      "front": "Por que os dormentes devem ser armazenados separados por fabricante no recebimento?",
      "back": "Para facilitar a identificação da nota fiscal e a devolução dos dormentes reprovados em caso de acionamento de garantia."
    },
    {
      "category": "IPT",
      "front": "A carga é de madeira nativa, madeira de lei, e não foi inspecionada pelo IPT. Qual é a decisão?",
      "back": "A carga não deve ser recebida. Madeira nativa deve ser 100% inspecionada pelo IPT; sem inspeção, deve ser recusada."
    },
    {
      "category": "IPT",
      "front": "No caso de dormente de eucalipto sem inspeção IPT, o que deve acompanhar a nota fiscal?",
      "back": "Deve haver autorização impressa junto com a nota fiscal. Sem autorização e sem identificação de inspeção IPT, a carga deve ser recusada e devolvida ao fornecedor."
    },
    {
      "category": "IPT",
      "front": "Como é feita a identificação IPT no dormente?",
      "back": "A identificação fica no topo, ou cabeça, do dormente e é composta por duas letras e um número."
    },
    {
      "category": "Inspeção em campo",
      "front": "Depois da verificação documental e da inspeção IPT, qual é o próximo passo do fiscal?",
      "back": "Verificar a condição dos dormentes. Se forem encontrados defeitos descritos na cartilha, as peças defeituosas devem ser separadas para devolução e deve ser aberto Relatório de Não Conformidade."
    },
    {
      "category": "Prazo",
      "front": "Em até quanto tempo após a descarga a verificação dos dormentes deve ser feita para acionamento da garantia?",
      "back": "Em até 7 dias corridos após a descarga."
    },
    {
      "category": "RNC",
      "front": "Quais informações de campo são necessárias para abrir a RNC de dormentes de madeira?",
      "back": "Nota fiscal, documento de isenção da inspeção IPT quando aplicável, tamanho total do lote, quantidade com defeito, tipos de defeitos, fotos, nome do fornecedor e tipo de dormente, se lei ou eucalipto."
    },
    {
      "category": "RNC",
      "front": "Quem deve ficar responsável pela abertura da RNC para dormentes de madeira?",
      "back": "A equipe de Qualidade e Eficiência de Via Permanente."
    },
    {
      "category": "Recusa",
      "front": "O lote com defeitos precisa sempre ser recusado integralmente?",
      "back": "Não. O lote pode ser recusado totalmente ou parcialmente. Na recusa parcial, os dormentes bons são utilizados e os ruins ficam separados para posterior recolhimento pelo fornecedor."
    },
    {
      "category": "Defeitos",
      "front": "Como a cartilha classifica os defeitos durante o recebimento?",
      "back": "Em defeitos aceitáveis e não aceitáveis. Os não aceitáveis, sozinhos, já justificam a recusa do dormente."
    },
    {
      "category": "Defeitos não aceitáveis",
      "front": "O fiscal encontra um dormente podre. Existe tolerância?",
      "back": "Não. Dormente podre é defeito não aceitável e deve ser recusado."
    },
    {
      "category": "Defeitos não aceitáveis",
      "front": "Há presença de casca no dormente recebido. Qual é a decisão?",
      "back": "Recusar. Presença de casca é defeito não aceitável."
    },
    {
      "category": "Proteção anti-rachante",
      "front": "Quando a madeira apresenta propensão ao fendilhamento, qual proteção o dormente deve receber?",
      "back": "Deve receber proteção anti-rachante, tipo gang nail, com área mínima de 70% da face/topo do dormente, aplicada nas duas faces/topos."
    },
    {
      "category": "Defeitos não aceitáveis",
      "front": "A proteção anti-rachante exigida não foi aplicada nas duas faces/topos de um dormente propenso ao fendilhamento. Qual é a decisão?",
      "back": "Não aceitar. A ausência da proteção anti-rachante requerida é defeito não aceitável."
    },
    {
      "category": "Amarração",
      "front": "O fardo chegou com menos de 3 fitas poliméricas ou sem os dois pontaletes nas extremidades. Pode aceitar?",
      "back": "Não. Amarração com menos de 3 fitas e/ou ausência dos dois pontaletes é defeito não aceitável na cartilha."
    },
    {
      "category": "Defeitos aceitáveis",
      "front": "Qual é o limite máximo de defeitos aceitáveis em um dormente?",
      "back": "São admitidos, no máximo, 2 defeitos aceitáveis por dormente."
    },
    {
      "category": "Fendilhamento",
      "front": "Quando o fendilhamento longitudinal ou racha de topo é aceitável?",
      "back": "Quando tiver no máximo 15 cm de comprimento e 2,0 mm de abertura, desde que esteja fora da zona de pregação/fixação."
    },
    {
      "category": "Fendilhamento",
      "front": "Um dormente apresenta racha de topo de 18 cm, mesmo fora da zona de pregação. Qual é a decisão?",
      "back": "Recusar, pois ultrapassa o limite de 15 cm de comprimento para defeito aceitável."
    },
    {
      "category": "Racha anelar",
      "front": "Qual é a tolerância para racha anelar ou rachadura de centro fora da área de fixação?",
      "back": "Menos de 15 cm de comprimento e 2,00 mm de largura, desde que fora da área de fixação."
    },
    {
      "category": "Dimensões",
      "front": "Qual é a tolerância dimensional para dormentes de madeira comuns ou de AMV?",
      "back": "Comprimento: +5 cm e -0 cm; largura: ±2 cm; altura: ±1 cm."
    },
    {
      "category": "Dimensões",
      "front": "Um dormente está com dimensão diferente da nota fiscal e da solicitação. Pode ser recebido?",
      "back": "Não. Dormentes com dimensões diferentes da nota fiscal e da solicitação não devem ser aceitos."
    },
    {
      "category": "Empeno",
      "front": "Como avaliar empeno vertical e horizontal?",
      "back": "A curvatura no plano vertical ou horizontal deve respeitar a flecha máxima conforme o tamanho do dormente, variando de 1,0 cm a 2,7 cm."
    },
    {
      "category": "Empeno",
      "front": "Qual é a flecha máxima para um dormente de 2,00 m?",
      "back": "1,0 cm."
    },
    {
      "category": "Empeno",
      "front": "Qual é a flecha máxima para um dormente de 2,80 m?",
      "back": "1,4 cm."
    },
    {
      "category": "Empeno",
      "front": "Qual é a flecha máxima para um dormente de 5,40 m?",
      "back": "2,7 cm."
    },
    {
      "category": "Aplicação",
      "front": "A especificação ENG-DSV-VP-ETM-D006/06.00 se aplica a quais tipos de via e componentes?",
      "back": "Dormentes de madeira tratada para vias de bitola métrica, larga, mista, aparelhos de mudança de via e pontes, incluindo dormentes especiais."
    },
    {
      "category": "Normas",
      "front": "Se a especificação da Rumo for mais restritiva do que a norma técnica citada, qual critério prevalece?",
      "back": "Prevalece a especificação da Rumo."
    },
    {
      "category": "Classes",
      "front": "Como são classificados os dormentes de madeira quanto à qualidade?",
      "back": "Em dormentes de primeira classe, com madeira de grande resistência físico-mecânica, e de segunda classe, com resistência físico-mecânica mediana e menor durabilidade."
    },
    {
      "category": "Classes",
      "front": "Qual percentual mínimo de madeiras de primeira classe deve existir no lote ofertado?",
      "back": "No mínimo 50% do lote deve ser composto por madeiras classificadas como primeira classe."
    },
    {
      "category": "Propriedades",
      "front": "Quais são os valores mínimos de MOE para dormente de primeira e segunda classe?",
      "back": "Primeira classe: 13.000 MPa. Segunda classe: 10.000 MPa."
    },
    {
      "category": "Propriedades",
      "front": "Quais são os valores mínimos de módulo de ruptura à flexão, MOR, para primeira e segunda classe?",
      "back": "Primeira classe: 50 MPa. Segunda classe: 40 MPa."
    },
    {
      "category": "Propriedades",
      "front": "Quais são os valores mínimos de Dureza Janka para primeira e segunda classe?",
      "back": "Primeira classe: 50 MPa. Segunda classe: 40 MPa."
    },
    {
      "category": "Propriedades",
      "front": "Qual massa aparente mínima deve ser atendida por dormentes de primeira e segunda classe?",
      "back": "Primeira classe: 750 kg/m³. Segunda classe: 600 kg/m³."
    },
    {
      "category": "Umidade",
      "front": "Com qual teor máximo de umidade os requisitos mínimos de desempenho são avaliados?",
      "back": "Com madeira na faixa de teor de umidade de, no máximo, 30%."
    },
    {
      "category": "AMV",
      "front": "Como os dormentes especiais para AMV devem ser identificados?",
      "back": "Devem ter o comprimento inscrito nos topos com tinta branca óleo."
    },
    {
      "category": "AMV",
      "front": "Dormente especial para AMV pode ter quina morta, desquinado ou esmoado?",
      "back": "Não. A especificação não admite dormentes especiais para AMV com quinas mortas, desquinados ou esmoados."
    },
    {
      "category": "Brocas e nós",
      "front": "Quando perfurações por brocas e nós cariados ainda podem ser tolerados?",
      "back": "Quando os orifícios não ultrapassam 2,5 cm de diâmetro, têm profundidade menor que 5 cm, não ficam na zona de pregação das placas e não ocorrem em excesso a ponto de comprometer a peça."
    },
    {
      "category": "Saliência e reentrância",
      "front": "Saliência ou reentrância é aceitável em qual condição?",
      "back": "Até 2 cm e desde que esteja fora da região de pregação."
    },
    {
      "category": "Nó vivo",
      "front": "Nó vivo pode ser aceito?",
      "back": "Sim, desde que esteja fora da zona de fixação."
    },
    {
      "category": "Fabricação",
      "front": "Que origem e condição a madeira deve ter para fabricação dos dormentes?",
      "back": "Deve ser originada de árvores sãs, abatidas vivas, de boa qualidade e boa densidade."
    },
    {
      "category": "Alburno",
      "front": "Qual é o limite máximo de alburno permitido nos dormentes de primeira e segunda classe?",
      "back": "No máximo 30% em volume de alburno."
    },
    {
      "category": "Tratamento",
      "front": "Como os dormentes devem ser fornecidos para a Rumo quanto à preservação?",
      "back": "Devem ser tratados com impregnação em autoclave, conforme os requisitos de preservação aplicáveis."
    },
    {
      "category": "Tratamento",
      "front": "Quais preservativos são indicados pela Rumo na especificação?",
      "back": "CCA, Cromo-Cobre-Arsênio, e CCB, Cromo-Cobre-Boro, desde que submetidos previamente à aprovação da Rumo."
    },
    {
      "category": "Tratamento",
      "front": "O fornecedor fica livre de responsabilidade quando a Rumo aprova o preservativo?",
      "back": "Não. A aprovação do preservativo pela Rumo não isenta o fornecedor da responsabilidade pelo tratamento dos dormentes e pelo subproduto do tratamento."
    },
    {
      "category": "Umidade",
      "front": "Quais níveis de umidade média são citados para impregnação oleosa/óleo solúvel e hidrossolúvel?",
      "back": "Impregnação com oleoso ou óleo solúvel: 25%. Impregnação com hidrossolúvel: 30%."
    },
    {
      "category": "Retenção",
      "front": "Qual é a retenção mínima de ingredientes ativos para CCA ou CCB?",
      "back": "9,6 kg/m³ na madeira permeável ou tratável."
    },
    {
      "category": "Tratamento",
      "front": "Após a preservação com CCA ou CCB, por quanto tempo mínimo os dormentes devem ficar armazenados no fornecedor?",
      "back": "Por pelo menos 15 dias, para garantir a completa fixação do preservativo."
    },
    {
      "category": "Geometria",
      "front": "Qual forma geométrica básica é exigida para o dormente de madeira?",
      "back": "Os dormentes devem ser serrados e constituir forma prismática, com seção transversal de quatro arestas."
    },
    {
      "category": "Geometria",
      "front": "Quando as faces dos dormentes são consideradas paralelas?",
      "back": "Quando a maior diferença entre as alturas encontradas for inferior a 1,0 cm."
    },
    {
      "category": "Dimensões por bitola",
      "front": "Qual é a dimensão final do dormente para bitola larga?",
      "back": "2,80 x 0,24 x 0,17 m."
    },
    {
      "category": "Dimensões por bitola",
      "front": "Qual é a dimensão final para bitola métrica em linhas de alta densidade?",
      "back": "2,20 x 0,24 x 0,17 m."
    },
    {
      "category": "Dimensões por bitola",
      "front": "Qual é a dimensão final para bitola métrica em linhas de baixa densidade?",
      "back": "2,00 x 0,24 x 0,17 m."
    },
    {
      "category": "Acabamento",
      "front": "Quais ocorrências não devem existir no acabamento final do dormente?",
      "back": "Casca, podridão, rachas anelares, rachas oblíquas longitudinais, nós, saliências, reentrâncias, rachaduras e fendas longitudinais na zona de fixação em qualquer face."
    },
    {
      "category": "Gabaritos",
      "front": "Quais características os gabaritos dimensionais devem acompanhar?",
      "back": "Esquadro, largura, altura, comprimento e posicionamento da zona de fixação dos dormentes."
    },
    {
      "category": "Acondicionamento",
      "front": "Como os dormentes aprovados devem ser empilhados no pátio do fornecedor?",
      "back": "Em pilhas superpostas de 5 dormentes de altura, separados por caibros, arrumados sobre duas peças sadias inaproveitáveis."
    },
    {
      "category": "Acondicionamento",
      "front": "Qual é a altura máxima das pilhas e a distância mínima entre pilhas?",
      "back": "Altura máxima de 1,20 m e distância mínima de 1,5 m entre pilhas."
    },
    {
      "category": "Acondicionamento",
      "front": "Dormentes de 1ª e 2ª classe podem ficar misturados na estocagem?",
      "back": "Não. Devem estar separados por classe."
    },
    {
      "category": "Manuseio",
      "front": "Por que não se devem usar ferramentas pontiagudas para movimentar dormentes impregnados?",
      "back": "Porque podem danificar a superfície já impregnada, prejudicando a proteção preservativa do dormente."
    },
    {
      "category": "Amarrados",
      "front": "Como deve ser o amarrado padrão para movimentação e transporte?",
      "back": "Amarrado 5x4, com 20 unidades, cintado com fitas poliméricas de resistência adequada, apoiado sobre dois pontaletes transversais."
    },
    {
      "category": "Amarrados",
      "front": "Quantas fitas são exigidas em dormentes de bitola métrica e em dormentes de bitola larga/mista?",
      "back": "No mínimo 3 fitas para bitola métrica e no mínimo 5 fitas para bitola larga e mista."
    },
    {
      "category": "Amarrados",
      "front": "Quais dimensões mínimas dos pontaletes do amarrado são indicadas?",
      "back": "Dois pontaletes transversais de madeira com no mínimo 8 cm x 8 cm x 96 cm."
    },
    {
      "category": "Ensaios antes do tratamento",
      "front": "Antes do tratamento, quais verificações podem levar à rejeição direta do dormente?",
      "back": "Divergência de espécie, alburno acima do limite, dimensão fora do especificado, defeitos acima dos limites e ocorrência de casca, podridão, saliências, reentrâncias, rachaduras ou fendas na zona de fixação."
    },
    {
      "category": "Ensaios antes do tratamento",
      "front": "Como a espécie da madeira pode ser verificada em caso de dúvida?",
      "back": "Por análise macro e microscópica. A identificação macroscópica usa lente de aumento de no mínimo 10 vezes e, havendo dúvida, retira-se corpo de prova para exame microscópico em laboratório."
    },
    {
      "category": "Ensaios antes do tratamento",
      "front": "Qual é o teor máximo de umidade nas peças retiradas para amostra de lote?",
      "back": "30%, para qualquer tipo de impregnação."
    },
    {
      "category": "Ensaios antes do tratamento",
      "front": "Qual ensaio mecânico deve ser verificado com instrumentação aferida antes do tratamento?",
      "back": "Ensaio de dureza Janka, com valores medidos atendendo à Tabela 1 da especificação."
    },
    {
      "category": "Ensaios após tratamento",
      "front": "Quais ensaios ou verificações são previstos após o tratamento?",
      "back": "Análise química quantitativa do preservativo, análise de retenção, verificação de penetração em todo o alburno, laudos conforme tamanho dos lotes e ensaios complementares se a Rumo julgar necessário."
    },
    {
      "category": "Qualificação do fornecedor",
      "front": "Qual comprovação mínima de fornecimento o fornecedor deve apresentar?",
      "back": "Atestado de fornecimento de, no mínimo, 50.000 dormentes de madeira para outras ferrovias tipo Heavy Haul nos últimos 5 anos."
    },
    {
      "category": "Qualificação do fornecedor",
      "front": "Além da capacidade técnica, que documentos e testes o fornecedor deve apresentar?",
      "back": "Testes comprobatórios de caracterização das essências usadas e documentação de autorização dos órgãos ambientais para sua atividade."
    },
    {
      "category": "Inspeção técnica",
      "front": "Durante a fabricação e até a liberação final para embarque, qual acesso a Rumo deve ter?",
      "back": "Livre acesso de representantes e inspetores da Rumo, a qualquer momento e sem necessidade de programação, às dependências da fábrica envolvidas no processo."
    },
    {
      "category": "Inspeção técnica",
      "front": "Como deve estar o pátio para inspeção dos dormentes?",
      "back": "Seco, limpo de vegetação e com condições adequadas de acesso aos inspetores e de manuseio das peças."
    },
    {
      "category": "Inspeção técnica",
      "front": "Como os dormentes devem ser classificados na inspeção?",
      "back": "Individualmente, com base na inspeção visual e nas medições, para enquadramento na classificação final."
    },
    {
      "category": "Inspeção técnica",
      "front": "Dormentes rejeitados podem ser ofertados novamente por preço inferior?",
      "back": "Não. Dormentes rejeitados não poderão ser ofertados, mesmo por preço inferior ao estabelecido."
    },
    {
      "category": "Aceitação",
      "front": "Quando um lote de dormentes de madeira é aceito?",
      "back": "Quando satisfaz plenamente às condições impostas pelos ensaios e exigências da especificação."
    },
    {
      "category": "Aceitação",
      "front": "Quando o lote será rejeitado pelo percentual de peças recusadas?",
      "back": "Quando a quantidade de peças rejeitadas for superior a 25% do total de peças do lote."
    },
    {
      "category": "Garantia",
      "front": "Qual é o período mínimo de garantia dos dormentes fornecidos?",
      "back": "10 anos a partir da data de recebimento."
    },
    {
      "category": "Garantia",
      "front": "Quais defeitos são cobertos pela garantia segundo a especificação?",
      "back": "Apodrecimento por ataque de fungos, rachaduras sem agentes externos como impactos, e empenos ocorridos e identificados no período de garantia."
    },
    {
      "category": "Meio ambiente",
      "front": "Qual requisito ambiental o fornecedor deve cumprir para fornecer dormentes de madeira?",
      "back": "Estar devidamente registrado nos órgãos competentes e em conformidade com as leis ambientais vigentes."
    },
    {
      "category": "Segurança",
      "front": "Quais EPIs são citados para pessoas envolvidas na movimentação de peças?",
      "back": "Luvas, capacete, óculos de proteção, calçado de segurança e demais EPIs necessários conforme a atividade e as normas de saúde e segurança."
    }
  ],
  "quiz": [
    {
      "question": "Uma carga de madeira de lei chega sem inspeção IPT. Qual atitude o fiscal deve tomar?",
      "options": [
        "Receber e abrir observação",
        "Recusar a carga",
        "Aceitar apenas se houver 3 fitas no fardo",
        "Liberar se o fornecedor prometer enviar laudo depois"
      ],
      "answer": 1,
      "explanation": "Cargas de madeira nativa devem ser 100% inspecionadas pelo IPT. Sem inspeção, a carga deve ser recusada."
    },
    {
      "question": "Qual é o prazo para verificar os dormentes após a descarga, visando acionamento de garantia?",
      "options": [
        "24 horas",
        "3 dias úteis",
        "7 dias corridos",
        "30 dias"
      ],
      "answer": 2,
      "explanation": "A cartilha orienta que a verificação seja feita em até 7 dias corridos após a descarga."
    },
    {
      "question": "Qual conjunto contém apenas defeitos não aceitáveis na cartilha?",
      "options": [
        "Podridão, presença de casca e ausência da proteção anti-rachante obrigatória",
        "Fendilhamento de 10 cm fora da pregação, empeno dentro da tabela e dimensão dentro da tolerância",
        "Nó vivo fora da zona de fixação, saliência de 1 cm fora da pregação e racha de 10 cm",
        "Esmoado dentro da dimensão mínima, flecha permitida e largura dentro da tolerância"
      ],
      "answer": 0,
      "explanation": "Podridão, presença de casca e falha na proteção anti-rachante obrigatória são defeitos não aceitáveis."
    },
    {
      "question": "Um dormente tem fendilhamento fora da zona de pregação com 14 cm de comprimento e 2,0 mm de abertura. Como classificar?",
      "options": [
        "Aceitável, desde que não ultrapasse o máximo de 2 defeitos aceitáveis",
        "Não aceitável automaticamente",
        "Aceitável somente se for AMV",
        "Recusar por toda racha ser proibida"
      ],
      "answer": 0,
      "explanation": "Fendilhamento fora da zona de pregação é aceitável até 15 cm e 2,0 mm, respeitado o máximo de 2 defeitos aceitáveis."
    },
    {
      "question": "Qual é a tolerância dimensional correta para dormentes comuns e de AMV?",
      "options": [
        "Comprimento ±5 cm, largura ±5 cm e altura ±5 cm",
        "Comprimento +5 cm/-0 cm, largura ±2 cm e altura ±1 cm",
        "Comprimento +10 cm/-10 cm, largura ±1 cm e altura ±2 cm",
        "Sem tolerância dimensional"
      ],
      "answer": 1,
      "explanation": "A tolerância indicada é comprimento +5 cm e -0 cm; largura ±2 cm; altura ±1 cm."
    },
    {
      "question": "Qual alternativa representa corretamente as dimensões finais de dormentes comuns por bitola?",
      "options": [
        "Larga: 2,80 x 0,24 x 0,17 m; métrica alta densidade: 2,20 x 0,24 x 0,17 m; métrica baixa densidade: 2,00 x 0,24 x 0,17 m",
        "Larga: 2,00 x 0,24 x 0,17 m; métrica alta: 2,80 x 0,24 x 0,17 m",
        "Todas as bitolas usam 2,40 x 0,24 x 0,17 m",
        "Somente AMV usa 2,80 x 0,24 x 0,17 m"
      ],
      "answer": 0,
      "explanation": "Essas são as dimensões finais indicadas na especificação para bitola larga, métrica alta densidade e métrica baixa densidade."
    },
    {
      "question": "Sobre tratamento preservativo, qual afirmação está correta?",
      "options": [
        "CCA ou CCB exigem retenção mínima de 9,6 kg/m³",
        "A aprovação da Rumo elimina a responsabilidade do fornecedor",
        "Não é necessário tratamento em autoclave",
        "Após tratamento, o dormente pode ser enviado sem tempo de fixação"
      ],
      "answer": 0,
      "explanation": "A especificação indica retenção mínima de 9,6 kg/m³ para CCA ou CCB e exige cuidados de fixação após preservação."
    },
    {
      "question": "Como deve ser o amarrado de dormentes para movimentação?",
      "options": [
        "5x4, 20 unidades, com fitas e pontaletes",
        "10x10, 100 unidades, sem pontaletes",
        "Qualquer arranjo desde que empilhado",
        "Amarrado sem fitas quando for madeira de lei"
      ],
      "answer": 0,
      "explanation": "A especificação prevê amarrados 5x4, totalizando 20 unidades, com fitas poliméricas e dois pontaletes transversais."
    },
    {
      "question": "Quando um lote deve ser rejeitado pelo critério de percentual de peças rejeitadas?",
      "options": [
        "Quando houver mais de 5% rejeitado",
        "Quando houver mais de 10% rejeitado",
        "Quando a quantidade rejeitada for superior a 25% do lote",
        "Somente quando 100% das peças forem ruins"
      ],
      "answer": 2,
      "explanation": "A especificação estabelece rejeição do lote quando a quantidade de peças rejeitadas for superior a 25% do total."
    },
    {
      "question": "Qual é o período mínimo de garantia dos dormentes fornecidos?",
      "options": [
        "1 ano",
        "3 anos",
        "5 anos",
        "10 anos"
      ],
      "answer": 3,
      "explanation": "A garantia mínima é de 10 anos a partir da data de recebimento."
    }
  ]
},
  {
    "id": "amv",
    "area": "AMV - Aparelho de Mudança de Via",
    "shortName": "AMV",
    "document": "ETM/ETS/PO AMV",
    "sourceLabel": "Especificações de AMV, componentes, manutenção preventiva/corretiva e montagem/desmontagem",
    "flashcards": [
        {
            "category": "Conceito",
            "front": "O que significa AMV?",
            "back": "AMV significa Aparelho de Mudança de Via. É o conjunto que permite direcionar o tráfego ferroviário para a via reta ou desviada."
        },
        {
            "category": "Conceito",
            "front": "O que caracteriza um AMV misto?",
            "back": "É o AMV com tráfego de trens em duas bitolas, normalmente 1.000 mm e 1.600 mm, exigindo atenção redobrada às cotas de salvaguarda das duas bitolas."
        },
        {
            "category": "Conceito",
            "front": "O que caracteriza um AMV de pátio?",
            "back": "É o AMV com tráfego apenas na Classe 1, normalmente equipado com aparelho de manobra manual."
        },
        {
            "category": "Conceito",
            "front": "O que caracteriza um AMV de mola?",
            "back": "É o AMV com sistema de mola para talonamento da chave. O aparelho de manobra deve ser do modelo National TrackWork."
        },
        {
            "category": "Conceito",
            "front": "O que caracteriza um AMV elétrico?",
            "back": "É o AMV com sistema elétrico-hidráulico para movimentação da chave, exigindo interação com TO quando a manutenção interferir na região crítica da chave."
        },
        {
            "category": "Objetivo",
            "front": "Qual é o objetivo da especificação de manutenção preventiva e corretiva de AMV?",
            "back": "Orientar e padronizar os serviços de inspeção, manutenção preventiva e corretiva dos AMVs, buscando maior vida útil dos materiais e maior segurança operacional."
        },
        {
            "category": "Objetivo",
            "front": "Qual é o objetivo do procedimento de montagem e desmontagem de AMV?",
            "back": "Estabelecer diretrizes e procedimentos técnicos para construção e demolição de AMV, considerando cuidados operacionais, segurança dos trabalhadores e gestão de resíduos."
        },
        {
            "category": "Aplicação",
            "front": "A quem se aplica o procedimento de montagem e desmontagem de AMV?",
            "back": "Às equipes de manutenção ferroviária da Rumo Operação Norte responsáveis pela construção e demolição de AMVs em vias com dormentação de madeira, concreto ou aço."
        },
        {
            "category": "Siglas",
            "front": "O que significam FLP, LPCA e MCH no contexto de AMV?",
            "back": "FLP é Folga de Livre Passagem; LPCA é Livre Passagem Coice da Agulha; MCH é Máquina de Chave."
        },
        {
            "category": "Responsabilidades",
            "front": "Quem é responsável por executar os serviços de manutenção de AMV?",
            "back": "A equipe de manutenção de Via Permanente e as equipes de construção de linhas e pátios novos, seguindo os critérios técnicos estabelecidos."
        },
        {
            "category": "Ferramentas",
            "front": "Antes de iniciar a manutenção de AMV, qual conferência deve ser feita?",
            "back": "Deve ser feito checklist de recursos e ferramentas mínimas para garantir qualidade, segurança e produtividade na execução."
        },
        {
            "category": "Ferramentas",
            "front": "Quais ferramentas mínimas aparecem no checklist de manutenção de AMV?",
            "back": "Paquímetro, régua bitoladora, medidor de desgaste de trilho de encosto para AMV, gabarito de desgaste de trilho, gabarito passa/não passa para jacarés, trena, esquadro, régua de nível e calibres de reperfilamento."
        },
        {
            "category": "Ferramentas",
            "front": "Com que frequência as ferramentas devem ser inspecionadas e identificadas?",
            "back": "Mensalmente, usando a cor do mês definida pela área de SST e pela política do Rumo Zero Acidente."
        },
        {
            "category": "Ferramentas",
            "front": "Quais cores de identificação são usadas nas ferramentas ao longo do ano?",
            "back": "Janeiro, maio e setembro: amarelo. Fevereiro, junho e outubro: verde. Março, julho e novembro: azul. Abril, agosto e dezembro: vermelho."
        },
        {
            "category": "SST",
            "front": "Máquinas de pequeno porte que se apoiam nos dois trilhos precisam de qual cuidado?",
            "back": "Devem possuir isolamento adequado para evitar ocupação indevida de linha, especialmente onde há sinalização."
        },
        {
            "category": "SST",
            "front": "Quais EPIs são obrigatórios para manutenção de AMV?",
            "back": "Luvas, capacete com jugular ou boné casquete, óculos, protetor auricular, botina com biqueira de composite, proteção metatarso e solado anti-perfurante, perneira, máscara contra poeira e uniforme com faixa refletiva."
        },
        {
            "category": "SST",
            "front": "O que é proibido aos empregados durante atividades na via?",
            "back": "É proibido andar sobre os trilhos ou entre trilhos, para evitar quedas, torções e atropelamento."
        },
        {
            "category": "SST",
            "front": "Quando o responsável pela frente de serviço deve abrir o boletim de serviço?",
            "back": "Com antecedência mínima de um dia, além de sinalizar a linha quando exigido e observar a circulação de trens conforme o Regulamento Operacional."
        },
        {
            "category": "SST",
            "front": "Serviços em túneis ou à noite exigem quais cuidados adicionais?",
            "back": "Uso de colete refletivo, iluminação adequada e Permissão de Trabalho contemplando riscos adicionais relacionados à iluminação."
        },
        {
            "category": "SST",
            "front": "É permitido usar ferramentas defeituosas ou improvisadas?",
            "back": "Não. As ferramentas devem ser inspecionadas antes da atividade, e é proibido usar ferramentas defeituosas ou improvisar."
        },
        {
            "category": "SST",
            "front": "Quais ferramentas do Rumo Zero Acidente devem ser usadas antes, durante e depois da atividade?",
            "back": "AIR, AST, VST, OPA e a técnica de Apontar e Falar."
        },
        {
            "category": "Ciclos de inspeção",
            "front": "Para AMVs de corredor com previsão NB1, qual é o ciclo mínimo?",
            "back": "Cotas e tinta a cada 30 dias, geometria a cada 180 dias e esmerilhamento a cada 360 dias."
        },
        {
            "category": "Ciclos de inspeção",
            "front": "Para AMVs de corredor com previsão NB2, qual é o ciclo mínimo?",
            "back": "Cotas e tinta a cada 30 dias, geometria a cada 120 dias e esmerilhamento a cada 180 dias."
        },
        {
            "category": "Ciclos de inspeção",
            "front": "Para AMVs de corredor com previsão NB3, qual é o ciclo mínimo?",
            "back": "Cotas e tinta a cada 30 dias, geometria a cada 120 dias e esmerilhamento a cada 90 dias."
        },
        {
            "category": "Ciclos de inspeção",
            "front": "Para AMVs de corredor com previsão NB4, qual é o ciclo mínimo?",
            "back": "Cotas e tinta a cada 30 dias, geometria a cada 90 dias e esmerilhamento a cada 90 dias."
        },
        {
            "category": "Ciclos de inspeção",
            "front": "Em pátio, o que fazer com AMV que tem mais de 20 trens diários?",
            "back": "Aplicar a mesma periodicidade da previsão NB1."
        },
        {
            "category": "Ciclos de inspeção",
            "front": "Em pátio, qual é a periodicidade mínima para AMV com tráfego entre 10 e 20 trens diários?",
            "back": "Inspeção no mínimo uma vez por semestre."
        },
        {
            "category": "Ciclos de inspeção",
            "front": "Em pátio, qual é a periodicidade mínima para AMV com tráfego menor que 10 trens diários?",
            "back": "Inspeção no mínimo uma vez por ano."
        },
        {
            "category": "Qualificação",
            "front": "Quem deve executar o procedimento de medição e manutenção do AMV?",
            "back": "Equipe treinada e qualificada conforme as especificações técnicas da Rumo aplicáveis aos limites geométricos de segurança."
        },
        {
            "category": "Medições",
            "front": "A que altura deve ser medida a bitola e as cotas do AMV?",
            "back": "A 16 mm abaixo da superfície de rolamento do trilho, usando régua de bitola ou, quando não for possível, trena."
        },
        {
            "category": "Medições",
            "front": "Como tratar rebarbas e desgastes horizontais do boleto durante a medição de bitola?",
            "back": "Devem ser desconsiderados, pois não representam a linha correta de medição da bitola."
        },
        {
            "category": "Medições",
            "front": "Onde medir a bitola a 2 metros da ponta da agulha?",
            "back": "A 2,00 m da ponta da agulha, a 16 mm abaixo da superfície de rolamento."
        },
        {
            "category": "Medições",
            "front": "Onde medir a bitola na ponta da agulha?",
            "back": "Em frente à ponta da agulha, com régua de bitola, a 16 mm abaixo da superfície de rolamento."
        },
        {
            "category": "Interdição",
            "front": "Qual condição de bitola na ponta da agulha exige interdição e correção?",
            "back": "Medida maior ou igual a 1621 mm na bitola larga ou maior ou igual a 1021 mm na bitola métrica."
        },
        {
            "category": "Livre passagem",
            "front": "Como medir a livre passagem da agulha aberta?",
            "back": "Na frente do eixo da primeira barra de conjugação até a ponta da agulha, com régua de bitola ou trena, registrando o menor valor encontrado."
        },
        {
            "category": "Interdição",
            "front": "Qual medida de livre passagem da agulha exige interdição e correção?",
            "back": "Medida menor que 95 mm."
        },
        {
            "category": "Interdição",
            "front": "Qual distância da ponta da agulha aberta até a agulha oposta exige interdição e correção?",
            "back": "Medida maior que 1510 mm para bitola larga ou maior que 910 mm para bitola métrica."
        },
        {
            "category": "Livre passagem",
            "front": "Onde medir a livre passagem no corpo da agulha?",
            "back": "Na região mais estreita entre a ponta da agulha e o calço do coice, do lado externo do boleto da agulha deslocada até a linha de bitola da agulha vedada."
        },
        {
            "category": "Coice",
            "front": "Onde medir a bitola no coice da agulha?",
            "back": "Em frente ao bloco fundido do coice, comum ou flutuante, a 16 mm abaixo da superfície de rolamento."
        },
        {
            "category": "Intermediária",
            "front": "Como medir a bitola entre o coice e a junta do jacaré?",
            "back": "No máximo a cada 2,0 m, na linha reta e na linha desviada, registrando no formulário a medida mais divergente dos limites."
        },
        {
            "category": "Jacaré",
            "front": "Onde medir a bitola na ponta do jacaré?",
            "back": "Em frente à ponta material do jacaré até o trilho de rolamento oposto, a 16 mm abaixo da superfície de rolamento."
        },
        {
            "category": "Jacaré",
            "front": "O que é a proteção da ponta do jacaré, PP?",
            "back": "É a medida entre a ponta material do jacaré e a parte ativa do contratrilho, na linha reta ou desviada, medida a 16 mm abaixo da superfície de rolamento."
        },
        {
            "category": "Restrição",
            "front": "Quando a proteção da ponta do jacaré exige restrição de velocidade?",
            "back": "Quando estiver entre 1552 mm e 1546 mm na bitola larga, ou entre 952 mm e 946 mm na bitola métrica, devendo restringir conforme a VMA e corrigir."
        },
        {
            "category": "Interdição",
            "front": "Quando a proteção da ponta do jacaré exige interdição?",
            "back": "Quando estiver menor que 1546 mm na bitola larga ou menor que 946 mm na bitola métrica."
        },
        {
            "category": "Jacaré",
            "front": "O que é a livre passagem na ponta do jacaré, LP?",
            "back": "É a medida entre o canal do jacaré em frente à ponta material e a parte ativa do contratrilho, na linha reta ou desviada."
        },
        {
            "category": "Contratrilho",
            "front": "Como medir a abertura da calha do contratrilho?",
            "back": "Na direção da ponta material do jacaré, com régua de bitola ou trena, a 16 mm abaixo da superfície de rolamento do trilho."
        },
        {
            "category": "Contratrilho",
            "front": "O que fazer se a abertura da calha do contratrilho for maior que 50 mm?",
            "back": "Deve ser corrigida. Em contratrilho fixo, trocar o componente. Em contratrilho ajustável, aplicar palhetas de ajuste até o limite máximo de 10 mm."
        },
        {
            "category": "Contratrilho",
            "front": "Se o contratrilho ajustável ainda ficar maior que 50 mm com 10 mm de palhetas, qual é a ação?",
            "back": "Trocar o contratrilho ajustável."
        },
        {
            "category": "Contratrilho",
            "front": "A medição de profundidade da calha se aplica a qual tipo de contratrilho?",
            "back": "Aplica-se ao contratrilho fixo. Não se aplica ao contratrilho ajustável porque ele não possui blocos espaçadores."
        },
        {
            "category": "AMV misto",
            "front": "Quando medir a abertura da calha do contratrilho externo?",
            "back": "Somente em AMVs mistos que possuam esse componente, em frente à ponta material do jacaré duplo."
        },
        {
            "category": "AMV misto",
            "front": "Em AMV misto sem contratrilho externo, qual ajuste deve ser observado na ponta do jacaré duplo?",
            "back": "Deve ser realizado o aperto da bitola de 20 mm na frente da ponta posterior ou anterior do jacaré duplo, conforme a configuração do AMV."
        },
        {
            "category": "Nivelamento",
            "front": "Que classe de limite deve ser adotada para empenos em AMV?",
            "back": "Adota-se a metodologia dos limites geométricos de segurança usando os limites de uma classe acima da VMA do local."
        },
        {
            "category": "Nivelamento",
            "front": "Como medir empeno em AMV de bitola mista?",
            "back": "Aplicar os mesmos limites e metodologia, registrando as medidas de ambas as bitolas do AMV."
        },
        {
            "category": "Perfil longitudinal",
            "front": "Qual é o limite de desnivelamento máximo em AMVs de mola e elétricos?",
            "back": "32 mm entre a junta de avanço e a cauda do jacaré, para bitola larga."
        },
        {
            "category": "Perfil longitudinal",
            "front": "Qual é o limite de desnivelamento máximo em AMVs de pátio?",
            "back": "51 mm, para bitola larga."
        },
        {
            "category": "Alinhamento",
            "front": "Qual tangente mínima deve existir na saída do AMV para via desviada?",
            "back": "No mínimo 20 m de tangente a partir da ponta teórica do jacaré até a linha desviada existente."
        },
        {
            "category": "Esquadro",
            "front": "Qual é o limite de esquadro das agulhas para AMVs de mola e elétricos?",
            "back": "O alinhamento entre pontas das agulhas não deve ultrapassar 20 mm. Entre 20 e 30 mm, solicitar manutenção em até 15 dias; acima de 30 mm, operar manualmente sargenteando a rota."
        },
        {
            "category": "Esquadro",
            "front": "Qual é o limite máximo de esquadro das agulhas em AMVs de pátio?",
            "back": "30 mm."
        },
        {
            "category": "Contratrilho",
            "front": "Qual bitola nas extremidades dos contratrilhos exige interdição?",
            "back": "Maior ou igual a 1528 mm para bitola larga ou maior ou igual a 928 mm para bitola métrica."
        },
        {
            "category": "Jacaré",
            "front": "Na medição de profundidade da calha do núcleo do jacaré, qual resultado garante que o friso alto não toque o fundo?",
            "back": "O resultado deve ser maior que 39 mm."
        },
        {
            "category": "Jacaré",
            "front": "Se houver marca de rodeiro no fundo da calha do jacaré, qual é a ação?",
            "back": "Interditar, independentemente do valor de profundidade da calha, quando aplicável aos AMVs de corredor."
        },
        {
            "category": "Jacaré parafusado",
            "front": "Em jacarés parafusados confeccionados de trilho, qual limite indica desgaste?",
            "back": "Medidas maiores que 16 mm caracterizam jacaré desgastado e requerem substituição."
        },
        {
            "category": "Trilho de encosto",
            "front": "Qual é o limite máximo de desgaste horizontal no trilho de encosto na região da ponta da agulha?",
            "back": "2 mm."
        },
        {
            "category": "Trilho de encosto",
            "front": "Qual é o limite máximo de desgaste vertical do trilho de encosto na região da agulha?",
            "back": "6 mm."
        },
        {
            "category": "Agulha",
            "front": "Qual é o desgaste longitudinal máximo da agulha?",
            "back": "152 mm. Se a medida estiver acima desse valor, deve-se proibir a inversão de rota na entrada do AMV."
        },
        {
            "category": "Agulha",
            "front": "Qual é o desgaste vertical máximo da ponta da agulha?",
            "back": "12 mm. Se a medida estiver acima desse valor, deve-se proibir a inversão de rota na entrada do AMV."
        },
        {
            "category": "Agulha",
            "front": "Onde é tomada a medição do desgaste vertical da agulha?",
            "back": "A 38 mm da extremidade da agulha, fora da região de concordância do raio, usando régua e paquímetro."
        },
        {
            "category": "Meia chave",
            "front": "É permitido substituir apenas a agulha ou apenas o trilho de encosto?",
            "back": "Não. Quando um deles atinge o limite de desgaste, a troca deve ser da meia-chave completa: agulha e trilho de encosto juntos."
        },
        {
            "category": "Meia chave",
            "front": "É permitido misturar agulha detalhe 5100 com trilho de encosto 6100, ou o inverso?",
            "back": "Não. É proibido haver no trecho meias-chaves com combinações 5100/6100 ou 6100/5100."
        },
        {
            "category": "Elevação",
            "front": "Como deve ser medida a elevação da agulha?",
            "back": "Com a agulha vedada, usando nível de bolha e paquímetro, com no mínimo três medições: início, meio e fim da elevação."
        },
        {
            "category": "Contratrilho fixo",
            "front": "Quando um bloco do contratrilho fixo exige interdição?",
            "back": "Quando o bloco não tiver nenhum parafuso em condições de aperto."
        },
        {
            "category": "Contratrilho fixo",
            "front": "O que fazer quando o contratrilho fixo atinge limite de desgaste?",
            "back": "Substituir o contratrilho. Para contratrilho fixo, não há ajuste das medidas."
        },
        {
            "category": "Contratrilho ajustável",
            "front": "Quando duas placas do contratrilho ajustável estão quebradas ou ausentes em sequência, qual é a ação?",
            "back": "Aplicar restrição de velocidade e atendimento emergencial."
        },
        {
            "category": "Contratrilho ajustável",
            "front": "Qual livre passagem deve ser observada nas extremidades do contratrilho ajustável?",
            "back": "A livre passagem nas extremidades deve ser maior que 70 mm."
        },
        {
            "category": "Barras de conjugação",
            "front": "Qual quantidade mínima de barras de conjugação para agulha de 5029 mm?",
            "back": "Mínimo de 2 barras, N1 e N2. Em AMVs de mola com agulha de 5029 mm, é necessária também barra N3 para evitar rotação no talonamento."
        },
        {
            "category": "Barras de conjugação",
            "front": "Qual quantidade mínima de barras de conjugação para agulha de 6705 mm?",
            "back": "Mínimo de 3 barras, N1, N2 e N3, com N1 e N3 transpassando o patim do trilho de encosto."
        },
        {
            "category": "Barras de conjugação",
            "front": "Qual quantidade mínima de barras de conjugação para agulha de 9144 mm?",
            "back": "Mínimo de 4 barras, N1, N2, N3 e N4. Em AMVs de mola com agulha de 9144 mm, é necessária também barra N5 para evitar rotação no talonamento."
        },
        {
            "category": "Barras de conjugação",
            "front": "É permitido existir barra de conjugação isolada em AMV de mola?",
            "back": "Não, salvo AMVs com circuito de via. Se houver barra isolada em AMV de mola, ela deve ser substituída imediatamente; com circuito de via, a barra isolada deve ser especial de fibra de vidro, Bluerod."
        },
        {
            "category": "Roletes",
            "front": "Qual é a função da placa roletada no AMV?",
            "back": "Auxiliar a movimentação da agulha, reduzindo esforços e diminuindo manutenção, especialmente em AMVs de mola e elétricos."
        },
        {
            "category": "Roletes",
            "front": "Com placa roletada instalada, ainda é necessário lubrificar as placas deslizantes?",
            "back": "Sim. Mesmo com roletes, as placas deslizantes devem ser lubrificadas, sem excesso e sempre após limpeza adequada."
        },
        {
            "category": "Roletes",
            "front": "Quais ferramentas são separadas para instalação ou remoção da placa roletada?",
            "back": "Chave de boca 13 mm e 1 1/4”, chave Allen 8, calibre de folga, trena e bloqueio para agulha, como madeira ou sargento."
        },
        {
            "category": "Roletes",
            "front": "Em quais perfis e comprimentos de agulha a placa roletada pode ser usada conforme o procedimento?",
            "back": "Nos perfis TR-57, TR-68 e UIC-60, em AMVs simples ou mistos com agulhas de 5029,2 mm, 6705,6 mm ou 9144,0 mm."
        },
        {
            "category": "Roletes",
            "front": "Qual folga máxima entre rolete e patim na instalação?",
            "back": "Os roletes devem ficar tangentes ao patim da agulha ou, no máximo, com 1 mm de folga."
        },
        {
            "category": "Roletes",
            "front": "Após instalar placa roletada, quantas movimentações da agulha devem ser feitas para verificar atuação?",
            "back": "Entre 3 e 10 movimentos, verificando se a agulha é elevada na posição aberta e se, na posição fechada, apoia na placa de deslizamento e não no rolete."
        },
        {
            "category": "Roletes",
            "front": "Quais torques são usados na placa roletada?",
            "back": "Parafusos de cabeça cilíndrica com chave Allen 8: 73 Nm. Porca autotravante: 373 Nm."
        },
        {
            "category": "Roletes",
            "front": "Após quanto tempo da instalação deve ser verificada a fixação da placa roletada?",
            "back": "Após aproximadamente 14 dias, ajustando a altura do rolete se necessário."
        },
        {
            "category": "Aparelho de manobra",
            "front": "Qual é a função essencial do aparelho de manobra?",
            "back": "Exercer pressão adequada para vedação perfeita das pontas das agulhas."
        },
        {
            "category": "Aparelho de manobra",
            "front": "O que verificar se a alavanca de manobra não tiver pressão adequada?",
            "back": "Verificar desgaste da alavanca ou de componentes do aparelho de manobra. Se houver desgaste, os componentes devem ser substituídos."
        },
        {
            "category": "Aparelho de manobra",
            "front": "O que fazer se houver deficiência na fixação do aparelho de manobra ou dos trincos aos dormentes?",
            "back": "Corrigir a fixação e, se necessário, substituir os dormentes."
        },
        {
            "category": "Aparelho de manobra",
            "front": "O que fazer quando há folgas nos trincos de travas do aparelho de manobra?",
            "back": "Substituir os trincos com folga."
        },
        {
            "category": "Aparelho de manobra",
            "front": "É permitida segunda correção de bitola/cotas no mesmo dormente de AMV?",
            "back": "Não. O excesso de furação compromete a capacidade do dormente de suportar os esforços do AMV."
        },
        {
            "category": "Cilindro de mola",
            "front": "O que é o cilindro de chave de mola?",
            "back": "É um dispositivo combinado de mola e amortecedor destinado a operar um AMV, permitindo também operação manual do aparelho de manobra."
        },
        {
            "category": "Cilindro de mola",
            "front": "O que a chave de mola permite quando um trem talona a chave?",
            "back": "Permite que as pontas das agulhas se afastem livremente do trilho de encosto e amortece o retorno."
        },
        {
            "category": "Cilindro de mola",
            "front": "Qual é o tempo aproximado de retorno das pontas das agulhas em AMV de mola?",
            "back": "Aproximadamente 15 segundos após a passagem do último rodeiro, em dois estágios: primeiro lento, depois rápido."
        },
        {
            "category": "Cilindro de mola",
            "front": "Se o retorno do cilindro de mola não ocorrer em dois estágios, o que fazer?",
            "back": "Substituir o cilindro imediatamente."
        },
        {
            "category": "Cilindro de mola",
            "front": "Qual força aproximada a mola do amortecedor exerce na haste?",
            "back": "Aproximadamente 500 kgf para assegurar o fechamento adequado das pontas das agulhas contra o trilho de encosto."
        },
        {
            "category": "Cilindro de mola",
            "front": "Qual deslocamento da haste garante a força de funcionamento do cilindro de mola?",
            "back": "A haste do pistão deve deslocar 10 mm para dentro e 10 mm para fora do cilindro, totalizando 20 mm de pressão na haste."
        },
        {
            "category": "Cilindro de mola",
            "front": "Em qual aparelho o cilindro de mola deve ser instalado?",
            "back": "Somente em aparelhos de manobra do tipo National TrackWork."
        },
        {
            "category": "Cilindro de mola",
            "front": "Como deve estar o nível do óleo hidráulico no cilindro de mola?",
            "back": "Exatamente abaixo do filtro de tela. Nível abaixo do recomendado pode danificar o dispositivo."
        },
        {
            "category": "Cilindro de mola",
            "front": "O que fazer se houver indício de vazamento de óleo no cilindro de mola?",
            "back": "Substituir o cilindro imediatamente."
        },
        {
            "category": "Pombinho",
            "front": "Onde é usado o aparelho de mudança de eixo da via, o Pombinho?",
            "back": "Somente em trecho de bitola mista, seguindo o ciclo de inspeção aplicável e os limites do checklist específico."
        },
        {
            "category": "Especificação AMV",
            "front": "O que define a especificação do AMV 1:10 bitola mista BMC?",
            "back": "Define características dos materiais, fabricação e condições de verificação e recebimento do AMV n°10, bitola mista 1.000/1.600 mm, agulha 5.029 mm, detalhe de ponta 5100, fixações elásticas e contratrilhos ajustáveis."
        },
        {
            "category": "Especificação AMV",
            "front": "Quais configurações são usadas no AMV misto D1D, D1E, E1D e E1E?",
            "back": "D1D: desvio à direita e bitola métrica à direita. D1E: desvio à direita e bitola métrica à esquerda. E1D: desvio à esquerda e bitola métrica à direita. E1E: desvio à esquerda e bitola métrica à esquerda."
        },
        {
            "category": "Especificação AMV",
            "front": "Quais perfis de trilho aparecem nas especificações de AMV 1:10 bitola mista?",
            "back": "TR-57, TR-68 ou UIC-60, conforme projeto e especificação."
        },
        {
            "category": "Especificação AMV",
            "front": "Qual é o comprimento da agulha no AMV 1:10 bitola mista BMC?",
            "back": "5.029 mm, ou 16 pés e 6 polegadas, conforme plano 112-03."
        },
        {
            "category": "Especificação AMV",
            "front": "Qual é a capacidade indicada para o AMV 1:10 bitola mista BMC?",
            "back": "32,5 toneladas por eixo e 65 km/h."
        },
        {
            "category": "Especificação AMV",
            "front": "Qual é a composição básica do AMV 1:10 bitola mista BMC?",
            "back": "3 agulhas retas, 3 trilhos de encosto de agulha, 8 contratrilhos, 3 jacarés, 1 aparelho de manobra manual New Century, placas especiais e placas de apoio conforme configuração."
        },
        {
            "category": "Especificação AMV",
            "front": "No AMV 1:10 bitola mista, qual é o perfil dos contratrilhos?",
            "back": "Perfil 33C1 com dureza superior a 320 HB."
        },
        {
            "category": "Especificação AMV",
            "front": "Qual é a fixação no dormente indicada para AMV 1:10 bitola mista?",
            "back": "Tirefond diâmetro 24 mm, com arruela dupla face conforme especificação aplicável."
        },
        {
            "category": "Especificação AMV",
            "front": "Qual é o comprimento da agulha no AMV 1:14 bitola mista BLC?",
            "back": "9.144 mm, ou 30 pés, com detalhe de ponta 5100."
        },
        {
            "category": "Especificação AMV",
            "front": "Quais perfis de trilho aparecem no AMV 1:14 bitola mista BLC?",
            "back": "TR-68 ou UIC-60, conforme especificação."
        },
        {
            "category": "Especificação AMV",
            "front": "No AMV 1:14 bitola mista BLC, qual bitola é comandante?",
            "back": "Bitola larga comandante, com bitola mista 1.000/1.600 mm."
        },
        {
            "category": "Especificação AMV",
            "front": "Como devem ser endurecidas as superfícies de rolamento dos núcleos dos jacarés?",
            "back": "Por martelamento ou explosão, conforme especificado no pedido de compra, para obtenção da dureza mínima."
        },
        {
            "category": "Especificação AMV",
            "front": "Qual é a dureza Brinell mínima citada para jacarés de aço manganês em especificações de AMV?",
            "back": "352 Brinell, não podendo exceder o limite máximo de 418 quando indicado na especificação."
        },
        {
            "category": "Especificação AMV",
            "front": "Qual é a profundidade do canal no núcleo do jacaré em especificações de AMV n°08 pavimentado e em vários jacarés AREMA?",
            "back": "53 ± 2 mm, conforme o plano aplicável citado na especificação."
        },
        {
            "category": "Especificação AMV",
            "front": "O que significa cauda baixo impacto no jacaré?",
            "back": "Indica que o jacaré deve manter a ponta material conforme o plano aplicável, mas com cauda baixo impacto conforme plano 601-18."
        },
        {
            "category": "Especificação AMV",
            "front": "O que caracteriza o AMV 1:08 pavimentado bitola mista BLC?",
            "back": "AMV n°08 para bitola mista, com agulhas em berço para área pavimentada, jacarés simples e duplo monoblocos, fixações elásticas e contratrilhos fixos."
        },
        {
            "category": "Especificação AMV",
            "front": "O que caracteriza o AMV 1:08 semi-pavimentado bitola mista BLC?",
            "back": "AMV n°08 para bitola mista, agulhas 5.029 mm detalhe 5100, jacarés simples e duplo monoblocos, fixações elásticas e contratrilhos fixos."
        },
        {
            "category": "Especificação AMV",
            "front": "Na especificação do AMV 1:08 bitola mista BLC, quantos contratrilhos há por AMV?",
            "back": "8 contratrilhos por AMV."
        },
        {
            "category": "Especificação AMV",
            "front": "Nas especificações de AMV, quem paga análises químicas, testes físicos e demais ensaios de inspeção e recebimento?",
            "back": "O fabricante, conforme as especificações de material."
        },
        {
            "category": "Inspeção em fábrica",
            "front": "A Rumo pode rejeitar material defeituoso encontrado durante a inspeção?",
            "back": "Sim. A Rumo se reserva o direito de rejeitar qualquer material defeituoso encontrado na inspeção."
        },
        {
            "category": "Inspeção em fábrica",
            "front": "Como os componentes do AMV devem ser pré-montados em fábrica?",
            "back": "Devem ser pré-montados os conjuntos das meias-chaves, jacarés e contratrilhos para viabilizar a inspeção."
        },
        {
            "category": "Inspeção em fábrica",
            "front": "Em cada lote de entrega de AMV, o que deve ser inspecionado?",
            "back": "Pelo menos uma unidade de cada componente do AMV, como jacaré, agulha, contratrilho e meia-chave, disposto de forma que permita a inspeção."
        },
        {
            "category": "Inspeção em fábrica",
            "front": "Como os acessórios do AMV devem ser despachados?",
            "back": "Em amarrados metálicos separados por tipo de componente, com identificação em cada amarrado."
        },
        {
            "category": "Garantia",
            "front": "Qual garantia de material aparece nas especificações de AMV metálico?",
            "back": "150 milhões de toneladas brutas trafegadas, conforme a especificação aplicável."
        },
        {
            "category": "AMV concreto",
            "front": "O que caracteriza o AMV 1:14 bitola larga com dormente de concreto?",
            "back": "AMV 1:14 de bitola larga, perfil TR-68, isolado, fixação elástica em dormentes de concreto, com escopo do primeiro ao último dormente conforme projeto conceitual."
        },
        {
            "category": "AMV concreto",
            "front": "Qual é a capacidade do AMV 1:14 bitola larga com dormente de concreto?",
            "back": "32,5 toneladas por eixo e 80 km/h."
        },
        {
            "category": "AMV concreto",
            "front": "Como deve ser a posição dos dormentes no AMV 1:14 com dormente de concreto?",
            "back": "Perpendicular, conforme norma AREMA."
        },
        {
            "category": "AMV concreto",
            "front": "Quais grampos são citados para o AMV 1:14 com dormente de concreto?",
            "back": "EClip-2009 para fixação do trilho/acessórios e fixação das placas do AMV, com condições de isolamento conforme projeto."
        },
        {
            "category": "AMV concreto",
            "front": "O que o fabricante de AMV deve apresentar para fixação elástica em dormente de concreto?",
            "back": "Estudos de montagem da placa de apoio, palmilha, fixação elástica e trilho, além de ensaios comprobatórios em laboratório acreditado conforme NBR 17033."
        },
        {
            "category": "AMV concreto",
            "front": "Quais ensaios são citados para homologação do conjunto em dormente de concreto?",
            "back": "Suspensão antes e depois da fadiga, retenção longitudinal antes e depois da fadiga, resistência elétrica e fadiga de 3 milhões de ciclos; além de ensaios nos dormentes e arrancamento das ombreiras."
        },
        {
            "category": "AMV concreto",
            "front": "Para homologação final dos dormentes de concreto e componentes de AMV, o que deve ser aguardado?",
            "back": "Um período de 12 meses após a instalação na via."
        },
        {
            "category": "Planejamento",
            "front": "Antes de montar ou desmontar AMV, qual é a primeira atitude técnica?",
            "back": "Realizar análise prévia dos aspectos operacionais e logísticos, além de reunião inicial com a equipe para apresentar o planejamento."
        },
        {
            "category": "Planejamento",
            "front": "O plano de trabalho de montagem/desmontagem deve conter quais informações?",
            "back": "Etapas, recursos humanos, equipamentos e logística de armazenamento temporário dos componentes."
        },
        {
            "category": "Planejamento",
            "front": "Quais condições ambientais e operacionais devem ser verificadas antes da atividade?",
            "back": "Previsão do tempo, autorizações no local e, se houver trem de serviço ou recurso ferroviário, inspeção, testes, sistemas de bordo e licenciamento em dia."
        },
        {
            "category": "Planejamento",
            "front": "Para desmontagem, que cuidado deve ser tomado com o sistema do AMV?",
            "back": "Certificar-se de que o sistema está desativado, com desligamento elétrico e hidráulico quando aplicável, e realizar bloqueio físico dos dispositivos de acionamento."
        },
        {
            "category": "Mobilização",
            "front": "Na mobilização para construção de AMV, como devem ser dispostos os materiais?",
            "back": "Vigotas, placas, trilhos e peças devem ficar organizados ao lado do trecho, em distância segura da via em operação, com biombos, sinalização e extintores."
        },
        {
            "category": "Construção",
            "front": "O que deve ser feito na preparação da caixa da via e lastro?",
            "back": "Limpar o trecho, remover detritos, verificar drenagem, nivelar e regularizar o lastro com brita adequada, compactando a região das vigotas para apoio estável."
        },
        {
            "category": "Vigotas",
            "front": "Como deve ser o assentamento das vigotas?",
            "back": "Nos locais de projeto, respeitando espaçamentos e padrões de disposição, com cordas-guia para paralelismo e contato pleno com o lastro."
        },
        {
            "category": "Trilhos de ligação",
            "front": "Qual cuidado deve ser tomado ao posicionar trilhos de ligação?",
            "back": "Evitar arrastar o trilho sobre o dormente para não danificar o perfil, usando cintas e equipamentos de içamento quando necessário."
        },
        {
            "category": "Agulha",
            "front": "Quando pode ser feito o aperto definitivo na montagem da região da agulha?",
            "back": "Somente após verificar o sincronismo entre as agulhas."
        },
        {
            "category": "Jacaré e contratrilho",
            "front": "Na montagem do jacaré, o que deve ser conferido?",
            "back": "Alinhamento do boleto com o trilho de ligação, continuidade com a via principal e folgas de livre passagem, fazendo ajuste fino por socaria e alavancagem."
        },
        {
            "category": "Fixações",
            "front": "Após aplicar grampos, tirefonds e placas bitoladoras, o que registrar?",
            "back": "Posições, tipo de fixação e torque aplicado em formulário específico, após inspeção visual de todas as fixações."
        },
        {
            "category": "Soldagem",
            "front": "Antes de executar solda aluminotérmica no AMV, o que deve ser garantido?",
            "back": "Ensaio de ajuste a frio, bitola e alinhamento dentro das tolerâncias de projeto, isolamento da área, biombos, extintores e restrição de pessoas não autorizadas."
        },
        {
            "category": "Aparelho de manobra",
            "front": "A regulagem da máquina de chave deve ser feita com qual equipe?",
            "back": "Em conjunto com a TO, ajustando tirantes, barras de conjugação e verificando sincronismo, retorno, travamento e livre passagem."
        },
        {
            "category": "Aceitação",
            "front": "Quais medições são obrigatórias para aceitação na montagem do AMV?",
            "back": "Bitola, superelevação, FLP, LPCA e níveis longitudinais e transversais, com instrumentos calibrados e registro em relatório."
        },
        {
            "category": "Não conformidade",
            "front": "O que fazer quando há desconformidade nas medições de montagem?",
            "back": "Executar ações corretivas e realizar novo ciclo de medição."
        },
        {
            "category": "Não conformidade",
            "front": "Como tratar uma não conformidade identificada na montagem?",
            "back": "Registrar em formulário específico com descrição, localização, gravidade, plano de ação e responsável. A ação corretiva só é liberada após análise técnica e aprovação do método de reparo."
        },
        {
            "category": "Registros",
            "front": "Quais documentos mínimos devem ser arquivados na montagem de AMV?",
            "back": "APR assinada, diário de obra, lista de presença, fichas de inspeção por etapa, checklist final, laudos de ensaios, relatório de soldagem, certificados de calibração, fotos do progresso e do resultado."
        },
        {
            "category": "Demolição",
            "front": "Na desmontagem do AMV, qual é a primeira etapa prática?",
            "back": "Remoção das fixações, soltando fixadores menores e desmontando talas gradualmente, mantendo a estrutura estável."
        },
        {
            "category": "Demolição",
            "front": "Na desmontagem de trilhos e contratrilhos, por onde começar?",
            "back": "Começar pelos contratrilhos, soltando parafusos e removendo placas de fixação antes dos trilhos principais."
        },
        {
            "category": "Demolição",
            "front": "Que cuidado tomar ao desmontar componentes da região da agulha?",
            "back": "Isolar a área, desativar o sistema de acionamento, evitar movimentação acidental, remover componentes com ferramentas adequadas e armazenar agulhas e mecanismos em local identificado."
        },
        {
            "category": "TO",
            "front": "Serviços em máquinas de chave e circuitos eletrônicos devem ser direcionados a quem?",
            "back": "Ao time de TO, que deve ser comunicado com antecedência para realização dessas atividades."
        },
        {
            "category": "Demolição",
            "front": "Qual cuidado deve ser tomado na desmontagem do jacaré?",
            "back": "Manter bloqueios ativos, soltar parafusos com chaves manuais, aplicar força equilibrada com alavancas e usar equipamento de içamento se necessário."
        },
        {
            "category": "Vigotas",
            "front": "Como devem ser tratadas as vigotas removidas?",
            "back": "Devem ser retiradas uma a uma, apoiadas em local seguro, inspecionadas visualmente e marcadas se tiverem danos estruturais, rachaduras ou lascamentos."
        },
        {
            "category": "Resíduos",
            "front": "Como tratar componentes desmontados do AMV?",
            "back": "Classificar como reutilizáveis, recicláveis ou descartáveis, transportar para áreas designadas e registrar a movimentação com fotos."
        },
        {
            "category": "Resíduos",
            "front": "Como tratar materiais contaminados por óleo?",
            "back": "Devem ser acondicionados em recipientes específicos e encaminhados ao destino autorizado mediante documentação."
        },
        {
            "category": "Finalização",
            "front": "O que deve ser feito na finalização e limpeza da atividade?",
            "back": "Remover resíduos metálicos, fragmentos de dormentes e componentes soltos, corrigir desníveis/buracos, fazer vistoria final e registrar a condição da via com fotos."
        }
    ],
    "quiz": [
        {
            "question": "Durante a inspeção da ponta da agulha, a bitola medida na larga está com 1621 mm. Qual é a ação correta?",
            "options": [
                "Apenas registrar para próxima inspeção",
                "Interditar e corrigir",
                "Liberar com restrição de 40 km/h",
                "Lubrificar e liberar"
            ],
            "answer": 1,
            "explanation": "Medida maior ou igual a 1621 mm para bitola larga exige interdição e correção."
        },
        {
            "question": "Na livre passagem da agulha aberta, o menor valor encontrado foi 92 mm. O que fazer?",
            "options": [
                "Aceitar, pois está acima de 90 mm",
                "Interditar e corrigir",
                "Apenas esmerilhar",
                "Somente trocar o jacaré"
            ],
            "answer": 1,
            "explanation": "Livre passagem da agulha menor que 95 mm exige interdição e correção."
        },
        {
            "question": "Na proteção da ponta do jacaré, a medida ficou abaixo de 1546 mm na bitola larga. Qual decisão?",
            "options": [
                "Interditar e corrigir",
                "Aplicar palheta de 10 mm e liberar",
                "Registrar apenas",
                "Trocar a barra de conjugação"
            ],
            "answer": 0,
            "explanation": "PP menor que 1546 mm na bitola larga exige interdição e correção."
        },
        {
            "question": "A abertura da calha de um contratrilho ajustável está maior que 50 mm. Qual é a primeira ação técnica possível?",
            "options": [
                "Trocar imediatamente sem tentativa de ajuste",
                "Aplicar palhetas de ajuste até o limite de 10 mm",
                "Soldar o contratrilho",
                "Proibir inversão de rota"
            ],
            "answer": 1,
            "explanation": "Para contratrilho ajustável, a correção pode usar palhetas até o máximo de 10 mm. Se ainda ficar fora, deve trocar."
        },
        {
            "question": "Qual é o desgaste longitudinal máximo admissível da agulha?",
            "options": [
                "95 mm",
                "120 mm",
                "152 mm",
                "200 mm"
            ],
            "answer": 2,
            "explanation": "O desgaste longitudinal máximo da agulha é 152 mm. Acima disso, deve-se proibir inversão de rota na entrada do AMV."
        },
        {
            "question": "Qual afirmação sobre troca de meia-chave está correta?",
            "options": [
                "Pode trocar só a agulha",
                "Pode trocar só o trilho de encosto",
                "Deve trocar a meia-chave completa quando agulha ou trilho de encosto atinge limite",
                "Pode misturar ponta 5100 com trilho 6100"
            ],
            "answer": 2,
            "explanation": "É proibido trocar apenas um dos componentes. A troca deve ser da meia-chave completa."
        },
        {
            "question": "Em agulha de 9144 mm, qual é a quantidade mínima de barras de conjugação?",
            "options": [
                "2 barras",
                "3 barras",
                "4 barras",
                "6 barras"
            ],
            "answer": 2,
            "explanation": "A agulha de 9144 mm exige no mínimo 4 barras: N1, N2, N3 e N4. Em AMV de mola, pode exigir N5."
        },
        {
            "question": "Depois de instalar placa roletada, qual verificação é recomendada após cerca de 14 dias?",
            "options": [
                "Verificar fixações e ajustar altura do rolete se necessário",
                "Remover a lubrificação das placas",
                "Trocar todas as barras",
                "Fazer nova solda aluminotérmica"
            ],
            "answer": 0,
            "explanation": "Após aproximadamente 14 dias, devem ser verificados elementos de fixação e posição/altura do rolete."
        },
        {
            "question": "Na construção de AMV, quais medições são obrigatórias para aceitação?",
            "options": [
                "Somente comprimento das vigotas",
                "Bitola, superelevação, FLP, LPCA e níveis longitudinal/transversal",
                "Somente torque dos tirefonds",
                "Apenas medição visual do jacaré"
            ],
            "answer": 1,
            "explanation": "O procedimento exige bitola, superelevação, FLP, LPCA e níveis longitudinais e transversais com instrumentos calibrados."
        },
        {
            "question": "Durante desmontagem de AMV, serviços em máquinas de chave e circuitos eletrônicos devem ser direcionados a qual equipe?",
            "options": [
                "PCM",
                "TO - Tecnologia Operacional",
                "Somente ao fornecedor de brita",
                "Apenas ao fiscal de materiais"
            ],
            "answer": 1,
            "explanation": "Serviços relacionados a máquinas de chave e circuitos eletrônicos devem ser direcionados ao time de TO, comunicado com antecedência."
        }
    ]
},
  {
      "id": "subcomponentes",
      "area": "Subcomponentes de fixação",
      "shortName": "Subcomponentes",
      "document": "INF-FX-0003-01 / Desenhos ENG-DVP",
      "sourceLabel": "Isoladores, capas, palmilhas, grampos, ombreiras e USP",
      "flashcards": [
          {
              "category": "Visão geral",
              "front": "Qual é o objetivo do informativo de isoladores, capas e palmilhas para Fast Clip em dormente de concreto?",
              "back": "Orientar a aplicação correta dos diferentes tipos de isoladores laterais, capas e palmilhas para fixação Fast Clip em dormentes de concreto com trilhos TR-68 e UIC-60."
          },
          {
              "category": "Identificação por cor",
              "front": "Por que as cores dos subcomponentes Fast Clip são importantes em campo?",
              "back": "As cores auxiliam a identificação das combinações e montagens corretas no dormente. Elas ajudam o fiscal a evitar troca de aplicação, mistura indevida de materiais e erro entre TR-68 e UIC-60."
          },
          {
              "category": "Fibra de vidro",
              "front": "Em quais situações os conjuntos com isoladores e capas reforçados com fibra de vidro são obrigatórios ou recomendados?",
              "back": "São obrigatórios para o Trecho 01 e recomendados para curvas com raio abaixo de 400 metros."
          },
          {
              "category": "Regra de montagem",
              "front": "Pode aplicar isoladores laterais e capas de composições distintas intercalados na via ou misturados no mesmo dormente?",
              "back": "Não. É expressamente proibida a aplicação intercalada na via ou mesclada no mesmo dormente de isoladores laterais e capas de composições distintas. O material deve ser aplicado em ilhas."
          },
          {
              "category": "Siglas",
              "front": "O que significam PA 6.6 e PA6FV nos subcomponentes?",
              "back": "PA 6.6 significa Poliamida 6.6. PA6FV significa Poliamida 6 reforçada com fibra de vidro."
          },
          {
              "category": "Isolador lateral TR-68",
              "front": "Qual isolador lateral deve ser usado para TR-68 quando o material é PA 6.6?",
              "back": "Isolador lateral PA 6.6 na cor branco/natural, SAP 121107, desenho ENG-DVP-D084."
          },
          {
              "category": "Isolador lateral TR-68",
              "front": "Qual isolador lateral deve ser usado para TR-68 quando o material é reforçado com fibra de vidro?",
              "back": "Isolador lateral PA6FV na cor preta, SAP 147555, desenho ENG-DVP-D084."
          },
          {
              "category": "Isolador UIC-60",
              "front": "Qual isolador externo especial deve ser usado no UIC-60 em PA 6.6?",
              "back": "Isolador lateral externo especial PA 6.6 na cor verde, SAP 127551, desenho ENG-DVP-D136."
          },
          {
              "category": "Isolador UIC-60",
              "front": "Qual isolador externo especial deve ser usado no UIC-60 em fibra de vidro?",
              "back": "Isolador lateral externo especial PA6FV na cor amarela, SAP 147554, desenho ENG-DVP-D136."
          },
          {
              "category": "UIC-60",
              "front": "Em trilho UIC-60, o mesmo isolador é usado nos dois lados do trilho?",
              "back": "Não. Deve ser usado um isolador TR-68 no lado interno da via e um isolador especial UIC-60 na parte externa da via."
          },
          {
              "category": "Capas",
              "front": "Qual capa de grampo deve ser usada para TR-68/UIC-60 quando o material é PA 6.6?",
              "back": "Capa PA 6.6 na cor branco/natural, SAP 99685, desenho ENG-DVP-D019."
          },
          {
              "category": "Capas",
              "front": "Qual capa de grampo deve ser usada para TR-68/UIC-60 quando o material é PA6FV?",
              "back": "Capa PA6FV na cor preta, SAP 147556, desenho ENG-DVP-D019."
          },
          {
              "category": "Palmilhas",
              "front": "Qual palmilha Fast Clip é aplicada em TR-68?",
              "back": "Palmilha PA 6.6 branco/natural, SAP 109105, desenho ENG-DVP-D183."
          },
          {
              "category": "Palmilhas",
              "front": "Qual palmilha Fast Clip é aplicada em UIC-60?",
              "back": "Palmilha PA 6.6 verde, SAP 127543, desenho ENG-DVP-D135."
          },
          {
              "category": "Palmilha resiliente",
              "front": "O fiscal encontrou solicitação de palmilha resiliente TR-68 azul/preta. Pode liberar sem consulta?",
              "back": "Não. Para aquisição e aplicação de palmilha resiliente, a Engenharia de Via Permanente deve ser consultada."
          },
          {
              "category": "Conjunto TR-68 PA 6.6",
              "front": "No conjunto TR-68 com isoladores PA 6.6, Opção 01, quais são os componentes?",
              "back": "Palmilha PA 6.6 branco/natural SAP 109105, isolador lateral PA 6.6 branco/natural SAP 121107 e capa PA 6.6 branco/natural SAP 99685."
          },
          {
              "category": "Conjunto TR-68 PA 6.6",
              "front": "No conjunto TR-68 com isoladores PA 6.6, Opção 02, o que muda em relação à Opção 01?",
              "back": "A palmilha e o isolador continuam em PA 6.6 branco/natural, mas a capa passa a ser PA6FV preta, SAP 147556."
          },
          {
              "category": "Conjunto TR-68 PA6FV",
              "front": "No conjunto TR-68 com isolador PA6FV, Opção 01, quais componentes devem aparecer?",
              "back": "Palmilha PA 6.6 branco/natural SAP 109105, isolador PA6FV preto SAP 147555 e capa PA6FV preta SAP 147556."
          },
          {
              "category": "Conjunto TR-68 PA6FV",
              "front": "No conjunto TR-68 com isolador PA6FV, Opção 02, qual capa é utilizada?",
              "back": "Capa PA 6.6 branco/natural SAP 99685, mantendo palmilha PA 6.6 branco/natural SAP 109105 e isolador PA6FV preto SAP 147555."
          },
          {
              "category": "Conjunto UIC-60 PA 6.6",
              "front": "No conjunto UIC-60 com isoladores PA 6.6, Opção 01, qual é a composição correta?",
              "back": "Palmilha PA 6.6 verde SAP 127543, isolador interno PA 6.6 branco/natural SAP 121107, isolador externo PA 6.6 verde SAP 127551 e capa PA 6.6 branco/natural SAP 99685."
          },
          {
              "category": "Conjunto UIC-60 PA 6.6",
              "front": "No conjunto UIC-60 com isoladores PA 6.6, Opção 02, qual componente é preto?",
              "back": "A capa é PA6FV preta, SAP 147556. A palmilha permanece verde, o isolador interno branco/natural e o isolador externo verde."
          },
          {
              "category": "Conjunto UIC-60 PA6FV",
              "front": "No conjunto UIC-60 com isoladores PA6FV, Opção 01, qual é a composição correta?",
              "back": "Palmilha PA 6.6 verde SAP 127543, isolador interno PA6FV preto SAP 147555, isolador externo PA6FV amarelo SAP 147554 e capa PA6FV preta SAP 147556."
          },
          {
              "category": "Conjunto UIC-60 PA6FV",
              "front": "No conjunto UIC-60 com isoladores PA6FV, Opção 02, qual capa é usada?",
              "back": "Capa PA 6.6 branco/natural SAP 99685, mantendo palmilha verde, isolador interno preto e isolador externo amarelo."
          },
          {
              "category": "Trecho 01",
              "front": "Você está fiscalizando material para o Trecho 01. O conjunto apresentado usa isoladores PA 6.6 comuns. Qual alerta fazer?",
              "back": "No Trecho 01, os conjuntos de isoladores reforçados com fibra de vidro são obrigatórios. O fiscal deve bloquear a liberação de conjunto comum quando a especificação pedir PA6FV."
          },
          {
              "category": "Curvas",
              "front": "Em uma curva com raio menor que 400 m, qual conjunto deve ser priorizado?",
              "back": "Deve-se recomendar o conjunto com isoladores e capas reforçados com fibra de vidro, respeitando a combinação correta para TR-68 ou UIC-60."
          },
          {
              "category": "Hidratação",
              "front": "Qual controle de hidratação é exigido para isoladores em PA 6.6?",
              "back": "Todo isolador em PA 6.6 deve passar por hidratação controlada em fábrica para garantir teor de umidade de 1,6% a 3,0%."
          },
          {
              "category": "Hidratação",
              "front": "Qual controle de hidratação é exigido para palmilhas em poliamida?",
              "back": "Toda palmilha em PA 6 deve passar por hidratação controlada em fábrica para garantir teor de umidade de 1,6% a 3,0%."
          },
          {
              "category": "Homologação",
              "front": "Qual norma deve ser seguida na homologação de isoladores PA 6.6?",
              "back": "A metodologia e os ensaios de homologação devem seguir a ABNT NBR 17033."
          },
          {
              "category": "Homologação",
              "front": "Para isoladores em fibra de vidro, qual carga deve ser considerada nos ensaios conforme o desenho?",
              "back": "Para isoladores em fibra de vidro, considerar a metodologia e os ensaios de homologação conforme ABNT NBR 17033 com carga de 9 toneladas."
          },
          {
              "category": "Identificação",
              "front": "Que identificação deve existir nos isoladores?",
              "back": "Identificação do fabricante, do material e lote/data de fabricação gravados em uma das regiões inativas da peça."
          },
          {
              "category": "Controle dimensional",
              "front": "Durante a fabricação dos isoladores, o que deve ser monitorado?",
              "back": "As dimensões com tolerâncias devem ser monitoradas durante a fabricação."
          },
          {
              "category": "Isolador lateral branco/preto",
              "front": "Quais são os SAPs do isolador lateral TR-68 em PA 6.6 e em fibra de vidro?",
              "back": "PA 6.6 branco/natural: SAP 121107. Fibra de vidro preto: SAP 147555."
          },
          {
              "category": "Isolador externo UIC-60",
              "front": "Quais são os SAPs do isolador externo especial UIC-60 em PA 6.6 e em fibra de vidro?",
              "back": "PA 6.6 verde: SAP 127551. Fibra de vidro amarelo: SAP 147554."
          },
          {
              "category": "Palmilha TR-68",
              "front": "Qual é a tolerância de comprimento principal da palmilha branca TR-68 Fast Clip SAP 109105 conforme a tabela de tolerâncias?",
              "back": "O comprimento deve ficar entre 187,50 mm e 191,50 mm."
          },
          {
              "category": "Palmilha TR-68",
              "front": "Quais faixas dimensionais devem ser conferidas na palmilha branca TR-68 Fast Clip SAP 109105?",
              "back": "187,50 a 191,50 mm; 151,00 a 155,00 mm; 111,50 a 114,50 mm; e 5,50 a 7,50 mm."
          },
          {
              "category": "Palmilha UIC-60",
              "front": "Quais são as tolerâncias da palmilha verde UIC-60 SAP 127543 conforme a tabela enviada?",
              "back": "148,50 a 150,00 mm; 113,00 a 114,00 mm; e 7,05 a 7,55 mm."
          },
          {
              "category": "Isolador verde/amarelo",
              "front": "Quais tolerâncias aparecem para os isoladores laterais verde e amarelo 3510W?",
              "back": "61,50 a 63,00 mm; 9,60 a 10,20 mm; e 7,40 a 8,00 mm."
          },
          {
              "category": "Isolador preto/branco",
              "front": "Quais tolerâncias aparecem para o isolador lateral preto 3502W e para o isolador lateral branco SAP 121107?",
              "back": "61,50 a 63,00 mm; 7,60 a 8,20 mm; e 7,40 a 8,00 mm."
          },
          {
              "category": "USP",
              "front": "Quais tolerâncias aparecem para o Under Sleeper Pad SAP 126980?",
              "back": "1360,00 a 1390,00 mm; 225,00 a 245,00 mm; e 7,00 a 11,00 mm."
          },
          {
              "category": "USP",
              "front": "Qual é a dimensão nominal do Under Sleeper Pad para bitola larga no desenho ENG-DVP-D131?",
              "back": "O desenho indica 1380,0 ±10 mm de comprimento e 235,0 ±3 mm de largura, com aplicação em dormente de concreto de bitola larga."
          },
          {
              "category": "USP",
              "front": "Em quais dormentes a aplicação do Under Sleeper Pad do desenho ENG-DVP-D131 é indicada?",
              "back": "Somente para os dormentes ENG-DVP-D130 e ENG-DVP-D140, conforme nota do desenho."
          },
          {
              "category": "Grampo Fast Clip",
              "front": "Qual é o material especificado para o grampo Fast Clip SAP 99604?",
              "back": "Aço SAE 9254."
          },
          {
              "category": "Grampo Fast Clip",
              "front": "Qual é a dureza especificada para o grampo Fast Clip?",
              "back": "44 a 48 HRC."
          },
          {
              "category": "Grampo Fast Clip",
              "front": "Qual é a pressão nominal do grampo Fast Clip?",
              "back": "1.200 kgf ±300 kgf."
          },
          {
              "category": "Grampo Fast Clip",
              "front": "Qual é o peso aproximado do grampo Fast Clip?",
              "back": "Aproximadamente 660 g."
          },
          {
              "category": "Grampo Fast Clip",
              "front": "Qual norma deve ser seguida para homologação do grampo Fast Clip?",
              "back": "ABNT NBR 17033, Partes I e II."
          },
          {
              "category": "Grampo Fast Clip",
              "front": "Qual plano de amostragem é indicado para o grampo Fast Clip?",
              "back": "NBR 5426/85, simples normal, nível geral de inspeção II e NQA de 2,5%."
          },
          {
              "category": "Grampo Fast Clip",
              "front": "Quais tolerâncias aparecem para o grampo W com isolador/capa SAP 99604 na tabela enviada?",
              "back": "106,50 a 111,00 mm; 15,75 a 16,25 mm; e 74,50 a 79,00 mm."
          },
          {
              "category": "Ombreira Fast Clip",
              "front": "Qual é a pressão nominal do grampo usada como referência na ombreira Fast Clip para concreto?",
              "back": "1.200 kgf ±300 kgf."
          },
          {
              "category": "Ombreira Fast Clip",
              "front": "Qual é a dureza indicada para a ombreira Fast Clip para concreto?",
              "back": "170 a 230 HB."
          },
          {
              "category": "Ombreira Fast Clip",
              "front": "A ombreira Fast Clip para concreto deve ter proteção superficial?",
              "back": "Não. O desenho informa proteção superficial: sem proteção."
          },
          {
              "category": "Ombreira Fast Clip",
              "front": "Como deve ser feita a homologação da ombreira Fast Clip?",
              "back": "Seguir ABNT NBR 11709 e ABNT NBR 17033 Partes I e II."
          },
          {
              "category": "Ombreira Fast Clip",
              "front": "Qual ensaio diário de controle de produção é exigido para ombreira Fast Clip?",
              "back": "O fabricante deve realizar ensaio de arrancamento em no mínimo 1 amostra a cada 400 peças fabricadas, aplicando carga vertical de 5,5 toneladas durante 5 minutos, conforme metodologia da ABNT NBR 11709."
          },
          {
              "category": "Ombreira Fast Clip",
              "front": "Onde devem constar os resultados dos ensaios de arrancamento da ombreira?",
              "back": "Os resultados devem estar no databook junto com as informações pertinentes ao controle de qualidade do processo de fabricação no momento da entrega do lote."
          },
          {
              "category": "Ombreira Fast Clip",
              "front": "Como o material da ombreira Fast Clip deve ser entregue?",
              "back": "Embalado ou encaixotado em lotes separados, com os lotes informados na nota fiscal."
          },
          {
              "category": "Ombreira Fast Clip",
              "front": "Que identificação cada ombreira deve conter?",
              "back": "Identificação do lote, fabricante e data em local visível fora da região de concretagem."
          },
          {
              "category": "Ombreira E-Clip",
              "front": "Qual é a dureza indicada para a ombreira E-Clip 2009 do desenho ENG-DVP-D139?",
              "back": "170 a 230 HB."
          },
          {
              "category": "Ombreira E-Clip",
              "front": "Qual controle diário de produção é exigido para a ombreira E-Clip 2009?",
              "back": "Ensaio de arrancamento em no mínimo 1 amostra a cada 400 peças fabricadas, com carga vertical de 5,5 toneladas por 5 minutos."
          },
          {
              "category": "Ombreira E-Clip",
              "front": "Quais tolerâncias aparecem na tabela para a ombreira E-CLIP HFOB02?",
              "back": "73,50 a 76,50 mm e uma dimensão mínima maior ou igual a 24,00 mm."
          },
          {
              "category": "Ombreira Fast Clip",
              "front": "Quais tolerâncias aparecem na tabela para a ombreira FAST-CLIP HFOB08?",
              "back": "99,75 a 102,25 mm; 58,70 a 60,70 mm; 95,90 a 98,10 mm; 70,30 a 72,50 mm; e 34,90 a 36,70 mm."
          },
          {
              "category": "Palmilha E-Clip",
              "front": "Qual é o material da palmilha para dormente de concreto UIC-60/TR-68 E-Clip não isolado?",
              "back": "Poliamida PA 6."
          },
          {
              "category": "Palmilha E-Clip",
              "front": "Que identificação deve existir na palmilha E-Clip não isolada?",
              "back": "Fabricante, material, lote/data e perfil do trilho gravados em uma região inativa da peça."
          },
          {
              "category": "Palmilha UIC-60",
              "front": "Qual é a cor da palmilha para dormente de concreto TR-68 adaptado para UIC-60?",
              "back": "Verde."
          },
          {
              "category": "Palmilha UIC-60",
              "front": "Que informações devem ser gravadas na palmilha verde UIC-60?",
              "back": "Identificação do fabricante, material, tipo de fixação e lote/data de fabricação gravados em uma região inativa da peça."
          },
          {
              "category": "Palmilha TR-68",
              "front": "A palmilha Fast Clip TR-68 ENG-DVP-D183 está liberada para fabricação ou aplicação sem autorização?",
              "back": "Não. O desenho informa que está pendente de aprovação e não deve ser usado para fabricação ou aplicação sem autorização da Engenharia de Via Permanente."
          },
          {
              "category": "Recebimento",
              "front": "O fiscal recebe isoladores PA 6.6 sem evidência de hidratação controlada. Qual é a preocupação?",
              "back": "O teor de umidade de 1,6% a 3,0% pode não estar garantido. Isso deve ser tratado como ponto crítico de recebimento e documentação."
          },
          {
              "category": "Recebimento",
              "front": "O lote de ombreiras chegou sem separação de lotes na embalagem e sem lote na nota fiscal. Qual alerta registrar?",
              "back": "A especificação exige entrega embalada ou encaixotada em lotes separados, com os lotes informados na nota fiscal. A rastreabilidade está comprometida."
          },
          {
              "category": "Recebimento",
              "front": "O fiscal encontra ombreira com identificação posicionada na região que ficará concretada. Está correto?",
              "back": "Não. A identificação deve ficar em local visível fora da região de concretagem."
          },
          {
              "category": "Recebimento",
              "front": "Um isolador chegou sem fabricante, material e lote/data gravados. Pode ser liberado normalmente?",
              "back": "Não. A falta de identificação prejudica rastreabilidade e contraria a exigência dos desenhos."
          },
          {
              "category": "Recebimento",
              "front": "A palmilha resiliente TR-68 foi solicitada sem consulta à Engenharia de Via Permanente. O que fazer?",
              "back": "Não liberar a aplicação/aquisição sem consulta, pois o informativo exige consulta à Engenharia para palmilha resiliente."
          },
          {
              "category": "Recebimento",
              "front": "Durante inspeção de conjunto UIC-60, há isolador externo branco/natural. Qual é o erro provável?",
              "back": "No UIC-60, o isolador externo deve ser especial: verde se PA 6.6 ou amarelo se PA6FV. O branco/natural é isolador TR-68 para o lado interno."
          },
          {
              "category": "Recebimento",
              "front": "Em trilho TR-68, o fiscal encontra palmilha verde UIC-60 aplicada. Qual ação tomar?",
              "back": "Questionar e bloquear a montagem, pois a palmilha indicada para TR-68 Fast Clip é branco/natural SAP 109105. A verde SAP 127543 é para UIC-60."
          },
          {
              "category": "Recebimento",
              "front": "Em UIC-60 com conjunto PA6FV, o isolador interno está amarelo e o externo preto. Está correto?",
              "back": "Não. Para UIC-60 PA6FV, o interno deve ser preto SAP 147555 e o externo deve ser amarelo SAP 147554."
          },
          {
              "category": "Recebimento",
              "front": "Em TR-68 para Trecho 01, o isolador é preto, a capa é preta e a palmilha é branca. A composição é coerente?",
              "back": "Sim, corresponde a uma opção com isolador PA6FV obrigatório para Trecho 01, usando palmilha TR-68 branco/natural."
          },
          {
              "category": "Recebimento",
              "front": "Em UIC-60, a palmilha é verde, o isolador interno preto, o externo amarelo e a capa branca. A composição é permitida?",
              "back": "Sim. É a opção UIC-60 com isoladores PA6FV e capa PA 6.6 branco/natural."
          },
          {
              "category": "Recebimento",
              "front": "Em TR-68, a palmilha é branca, o isolador branco e a capa preta. A composição é permitida?",
              "back": "Sim. É a Opção 02 para TR-68 com isolador PA 6.6 e capa PA6FV."
          },
          {
              "category": "Recebimento",
              "front": "Em TR-68, metade dos dormentes usa conjunto branco e metade conjunto preto intercalado na via. Qual é a falha?",
              "back": "A aplicação intercalada de composições distintas é proibida. O material deve ser aplicado em ilhas."
          },
          {
              "category": "Tolerâncias",
              "front": "Palmilha branca TR-68 medida com 184 mm no comprimento principal. Qual é a decisão técnica?",
              "back": "Não conforme para a tolerância indicada de 187,50 a 191,50 mm. O fiscal deve segregar ou bloquear conforme processo de qualidade."
          },
          {
              "category": "Tolerâncias",
              "front": "Palmilha verde UIC-60 medida com espessura de 7,30 mm. Está dentro da tolerância?",
              "back": "Sim. A faixa indicada é de 7,05 a 7,55 mm."
          },
          {
              "category": "Tolerâncias",
              "front": "Isolador lateral preto medido com 8,50 mm em uma dimensão cujo limite é 7,60 a 8,20 mm. Está conforme?",
              "back": "Não. A medição excede o limite máximo de 8,20 mm."
          },
          {
              "category": "Tolerâncias",
              "front": "USP medido com 224 mm de largura. Está conforme a tabela de tolerâncias?",
              "back": "Não. A largura indicada deve ficar entre 225,00 mm e 245,00 mm."
          },
          {
              "category": "Tolerâncias",
              "front": "Grampo Fast Clip medido com diâmetro/espessura de 16,10 mm na dimensão controlada de 15,75 a 16,25 mm. Está conforme?",
              "back": "Sim. O valor está dentro da faixa especificada."
          },
          {
              "category": "Tolerâncias",
              "front": "Ombreira Fast Clip HFOB08 com medida de 103,0 mm na dimensão cujo limite é 99,75 a 102,25 mm. Está conforme?",
              "back": "Não. Excede o limite máximo indicado."
          },
          {
              "category": "Documentação",
              "front": "Que documentos devem ser observados quando houver divergência de componentes Fast Clip?",
              "back": "O informativo de aplicação, os desenhos técnicos aplicáveis, a tabela de tolerâncias e os documentos de homologação/qualidade do fornecedor."
          },
          {
              "category": "Documentação",
              "front": "Qual informação do desenho o fiscal deve tratar com cuidado antes de liberar fabricação ou aplicação?",
              "back": "Notas como 'desenho poderá sofrer alteração sem aviso prévio' e, quando houver, 'pendente de aprovação'. A versão e autorização da Engenharia devem ser conferidas."
          },
          {
              "category": "Qualidade",
              "front": "Por que a rastreabilidade de lote/data é tão importante nos subcomponentes?",
              "back": "Porque permite identificar origem, material, data de fabricação, lote afetado e acionar tratativas de qualidade caso haja não conformidade em campo ou recebimento."
          },
          {
              "category": "Qualidade",
              "front": "Qual é a principal diferença visual entre isolador PA6FV para TR-68 e isolador PA6FV externo UIC-60?",
              "back": "O isolador PA6FV TR-68 é preto; o isolador PA6FV externo especial UIC-60 é amarelo."
          },
          {
              "category": "Qualidade",
              "front": "Qual é a principal diferença visual entre palmilha TR-68 e palmilha UIC-60 Fast Clip?",
              "back": "A palmilha TR-68 é branco/natural; a palmilha UIC-60 é verde."
          },
          {
              "category": "Qualidade",
              "front": "Qual é o risco de aplicar componentes de materiais diferentes no mesmo dormente sem seguir as opções previstas?",
              "back": "Pode haver montagem fora da especificação, perda de padronização, dificuldade de rastreabilidade e comportamento mecânico diferente do conjunto previsto."
          },
          {
              "category": "Qualidade",
              "front": "Um lote de grampos não apresenta laudo de amostragem conforme NBR 5426/85. Qual ponto deve ser cobrado?",
              "back": "Deve ser cobrado o plano de amostragem simples normal, nível geral de inspeção II, NQA 2,5%, além dos demais ensaios e evidências de homologação."
          }
      ],
      "quiz": [
          {
              "question": "Qual é a regra para aplicação de isoladores laterais e capas de composições distintas?",
              "options": [
                  "Pode intercalar livremente na via",
                  "Pode misturar no mesmo dormente se a cor for parecida",
                  "É proibido intercalar ou mesclar; deve aplicar em ilhas",
                  "Só é proibido em UIC-60"
              ],
              "answer": 2,
              "explanation": "O informativo proíbe aplicação intercalada na via ou mesclada no mesmo dormente. O material deve ser aplicado em ilhas."
          },
          {
              "question": "Para o Trecho 01, qual tipo de conjunto é obrigatório?",
              "options": [
                  "Conjuntos com isoladores e capas reforçados com fibra de vidro",
                  "Somente componentes brancos de PA 6.6",
                  "Qualquer conjunto desde que seja Fast Clip",
                  "Apenas palmilha resiliente"
              ],
              "answer": 0,
              "explanation": "Os conjuntos reforçados com fibra de vidro são obrigatórios para o Trecho 01."
          },
          {
              "question": "No trilho UIC-60, qual é a montagem correta dos isoladores?",
              "options": [
                  "Isolador TR-68 nos dois lados",
                  "Isolador especial UIC-60 nos dois lados",
                  "Isolador TR-68 no lado interno e isolador especial UIC-60 no lado externo",
                  "Não se usam isoladores em UIC-60"
              ],
              "answer": 2,
              "explanation": "O informativo orienta usar isolador TR-68 no lado interno da via e isolador especial UIC-60 na parte externa."
          },
          {
              "question": "Qual é a cor da palmilha Fast Clip para UIC-60?",
              "options": [
                  "Branco/natural",
                  "Verde",
                  "Preto",
                  "Amarelo"
              ],
              "answer": 1,
              "explanation": "A palmilha UIC-60 é PA 6.6 verde, SAP 127543."
          },
          {
              "question": "Qual é a cor do isolador lateral TR-68 em fibra de vidro?",
              "options": [
                  "Branco/natural",
                  "Verde",
                  "Preto",
                  "Amarelo"
              ],
              "answer": 2,
              "explanation": "O isolador lateral TR-68 em PA6FV é preto, SAP 147555."
          },
          {
              "question": "Qual é a cor do isolador externo especial UIC-60 em fibra de vidro?",
              "options": [
                  "Branco/natural",
                  "Preto",
                  "Verde",
                  "Amarelo"
              ],
              "answer": 3,
              "explanation": "O isolador externo especial UIC-60 em PA6FV é amarelo, SAP 147554."
          },
          {
              "question": "Qual teor de umidade deve ser garantido após hidratação controlada em fábrica para peças de poliamida indicadas?",
              "options": [
                  "0,5% a 1,0%",
                  "1,6% a 3,0%",
                  "3,5% a 5,0%",
                  "Acima de 10%"
              ],
              "answer": 1,
              "explanation": "Isoladores em PA 6.6 e palmilhas em PA devem passar por hidratação controlada para garantir 1,6% a 3,0% de umidade."
          },
          {
              "question": "Qual é a pressão nominal do grampo Fast Clip SAP 99604?",
              "options": [
                  "500 kgf ±100 kgf",
                  "800 kgf ±200 kgf",
                  "1.200 kgf ±300 kgf",
                  "5,5 toneladas por 5 minutos"
              ],
              "answer": 2,
              "explanation": "O desenho do grampo especifica pressão nominal de 1.200 kgf ±300 kgf."
          },
          {
              "question": "Qual ensaio de controle diário é exigido para ombreiras, no mínimo a cada 400 peças?",
              "options": [
                  "Ensaio de granulometria",
                  "Ensaio de arrancamento com carga vertical de 5,5 toneladas por 5 minutos",
                  "Ensaio de dureza Janka",
                  "Ensaio de absorção de água por 24 horas"
              ],
              "answer": 1,
              "explanation": "O fabricante deve executar ensaio de arrancamento em pelo menos uma amostra a cada 400 peças, com carga vertical de 5,5 toneladas durante 5 minutos."
          },
          {
              "question": "Qual faixa de tolerância está correta para a palmilha verde UIC-60 na espessura controlada?",
              "options": [
                  "5,50 a 7,50 mm",
                  "7,05 a 7,55 mm",
                  "9,60 a 10,20 mm",
                  "15,75 a 16,25 mm"
              ],
              "answer": 1,
              "explanation": "A tabela de tolerâncias indica 7,05 a 7,55 mm para a palmilha verde UIC-60."
          }
      ]
  }
];