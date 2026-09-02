# -*- coding: utf-8 -*-
"""Conteúdo PADRÃO da demonstração "Veja na prática": um RESUMO da unidade 01 de
História do Brasil (O Período Pré-Colonial e as Primeiras Iniciativas de Ocupação),
escrito a partir do texto real, com uma aula real da professora. Não é o conteúdo
da plataforma ipsis litteris: é uma simulação editável no admin (Comercial →
Landing page → Veja na prática). Nos parágrafos, [[Termo]] vira o balão do glossário
(precisa existir em paineis.texto.termos)."""

ROTAS = 'https://kluqjqojxzpuiauuidwx.supabase.co/storage/v1/object/public/general-images/1783014221070-jrjw2w.png'
SAO_VICENTE = 'https://kluqjqojxzpuiauuidwx.supabase.co/storage/v1/object/public/general-images/1783016850201-lffuvk.jpg'
MISSA = 'https://drive.google.com/thumbnail?id=1o_KNeOwmAUA8LTIMkDqr6TaMr3-8PByD&sz=w1920'
DESEMBARQUE = 'https://drive.google.com/thumbnail?id=1Na1zbp5FtUKretBbPPgC57x00O2Bo4eV&sz=w1920'
TERRA_BRASILIS = 'https://drive.google.com/thumbnail?id=1bdXhz-XEAIrCj2Nn43EgivvA0D-eLRxs&sz=w1920'
STADEN = 'https://drive.google.com/thumbnail?id=1QLOgYD_4V-6U56_KNpxChkvjhmatEVKt&sz=w1920'
POVOS = 'https://drive.google.com/thumbnail?id=10hl1XCHAgfMm_z-x7_ieor2I3vIHUejg&sz=w1920'
DIVISAO = 'https://drive.google.com/thumbnail?id=1HiQqUvEPFRbzy9rKf7gKdGvBPCYFNO0Q&sz=w1920'
ROTAS_MEDIEVAIS = 'https://drive.google.com/thumbnail?id=1gLXqgfZEHsHkDQF3FisgeE49MJEfn0ha&sz=w1920'
PAU_BRASIL = 'https://drive.google.com/thumbnail?id=1C1FvbkxXB6a0FdMTkDtzM5RbvvDm2LLy&sz=w1920'
HENRIQUE = 'https://upload.wikimedia.org/wikipedia/commons/0/02/Henry_the_Navigator1.jpg'
GAMA = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Vasco_da_Gama_%28without_background%29.jpg/250px-Vasco_da_Gama_%28without_background%29.jpg'
COLOMBO = 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Portrait_of_a_Man%2C_Said_to_be_Christopher_Columbus.jpg'
CEUTA = 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Infante_D._Henrique_na_conquista_de_Ceuta%2C_s.XV.JPG'
COLOMBO_MAPA = 'https://upload.wikimedia.org/wikipedia/commons/7/70/Primer_viaje_de_Col%C3%B3n.svg'
GAMA_IMG = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Vascodagama.JPG'

DEMO = {
  'lancamento': {
    'meta': 'Demonstração interativa · História do Brasil · Unidade 01',
    'titulo': 'Abrir a unidade <em>"O Período Pré-Colonial"</em>',
    'desc': 'Um resumo da primeira unidade de História do Brasil, com uma aula real da professora Cláudia Viscardi. Mesmo design, mesmas funcionalidades: grife um trecho, vire os flashcards, responda às questões.',
    'botao': 'Iniciar a demonstração',
    'thumbs': [ { 'label': 'Texto · Vídeo', 'img': ROTAS }, { 'label': 'Linha do tempo', 'img': MISSA }, { 'label': 'Questões · Discursiva', 'img': TERRA_BRASILIS } ],
    'blocos': ['Texto', 'Vídeo', 'Pontos-chave', 'Linha do tempo', 'Galeria', 'Glossário', 'Tabelas', 'Biografias', 'Citações', 'Bibliografia', 'Questões', 'Discursivas', 'Flashcards', 'Fórum']
  },
  'unidade': {
    'lateral': 'Unidade 01',
    'eyebrow': 'Unidade 01 · 47 min · Brasil Colônia',
    'titulo': 'O Período Pré-Colonial e as <em>Primeiras Iniciativas de Ocupação</em>',
    'sub': 'Versão resumida da unidade real: da gênese de Portugal ao início da colonização, com uma aula da professora.'
  },
  'grupos': [
    { 'titulo': '1 · A expansão', 'blocos': ['texto', 'video', 'keypoints', 'timeline', 'galeria'] },
    { 'titulo': '2 · Referência', 'blocos': ['glossario', 'tabelas', 'biografias', 'citacoes', 'bibliografia'] },
    { 'titulo': '3 · Avaliação e revisão', 'blocos': ['quiz', 'discursiva', 'flashcards', 'forum'] }
  ],
  'paineis': {
    'texto': {
      'lateral': 'Por que Portugal chegou primeiro', 'rotulo': 'Leitura',
      'titulo': 'De Portugal ao <em>Brasil</em>: por que os portugueses chegaram primeiro',
      'desc': 'Resumo do texto da unidade: a formação precoce do Estado português, os motivos e os meios da expansão e o caminho até 1500.',
      'audio': 'Ouvir · 4 min',
      'paragrafos': [
        { 'titulo': 'A crise do século XIV', 'html': 'A expansão marítima nasce de uma crise. A [[Peste Negra]] (1347–1351) dizimou cerca de um terço da Europa, desorganizou a ordem feudal e abriu espaço para reis centralizadores, que se apresentavam como a única força capaz de restaurar a ordem, e para a busca de novas rotas e de metais preciosos.' },
        { 'titulo': 'Portugal chega primeiro', 'html': 'Forjado na Reconquista, Portugal centralizou o poder cedo. A [[Revolução de Avis]] (1383–1385) aliou a Coroa à burguesia mercantil de Lisboa e do Porto e transformou a navegação numa política de Estado. É o [[Estado patrimonial]] descrito por Raymundo Faoro: o rei como soberano e grande empresário do reino.' },
        { 'titulo': 'Motivos e meios', 'html': 'Especiarias, fome de metais e o [[mercantilismo]] explicam o porquê. Caravela, astrolábio e cartografia explicam o como. O espírito de Cruzada, herdado da Reconquista, e a mentalidade renascentista completam o quadro.' },
        { 'titulo': 'O périplo africano', 'html': 'De Ceuta (1415) ao Cabo da Boa Esperança (1488), a costa da África foi a escola náutica de Portugal e a base do seu império de [[feitorias]]. Em 1498, Vasco da Gama chega à Índia pela Rota do Cabo e o pequeno reino vira potência.' },
        { 'titulo': 'A divisão do mundo e a chegada ao Brasil', 'html': 'A viagem de Colombo (1492) forçou a repactuação do Atlântico. A Bula <em>Inter Coetera</em> desagradou Portugal, e o [[Tratado de Tordesilhas]] (1494) moveu a linha para 370 léguas a oeste de Cabo Verde, garantindo o futuro Brasil antes de Cabral. Em 22 de abril de 1500, a esquadra avistou o Monte Pascoal.' },
        { 'titulo': 'Pré-colonial (1500–1530) e a virada', 'html': 'Três décadas de negligência calculada: pau-brasil, [[escambo]] com os povos tupi, feitorias e o monopólio régio arrendado a Fernão de Loronha. A ameaça francesa e a queda dos lucros do Oriente levaram D. João III a colonizar: Martim Afonso de Sousa funda São Vicente (1532) e, em 1534, vêm as Capitanias Hereditárias.' }
      ],
      'termos': [
        { 'termo': 'Peste Negra', 'def': 'Epidemia que assolou a Europa entre 1347 e 1351, dizimando cerca de um terço da população e desestruturando a ordem feudal.' },
        { 'termo': 'Revolução de Avis', 'def': 'Crise de 1383–1385: com a morte de D. Fernando I, a burguesia e o povo apoiaram o Mestre de Avis contra Castela. A vitória em Aljubarrota (1385) entronizou a Dinastia de Avis.' },
        { 'termo': 'Estado patrimonial', 'def': 'Modelo de Estado, descrito por Raymundo Faoro, em que não há separação clara entre o patrimônio público e o do governante: o rei é soberano e o grande gestor econômico do reino.' },
        { 'termo': 'mercantilismo', 'def': 'Conjunto de práticas econômicas dos Estados europeus entre os séculos XV e XVIII: metalismo, balança comercial favorável, protecionismo e colônias sob monopólio (pacto colonial).' },
        { 'termo': 'feitorias', 'def': 'Entrepostos comerciais fortificados no litoral: armazém, ponto de troca e fortaleza. Modelo criado na África e repetido no Brasil do pau-brasil.' },
        { 'termo': 'Tratado de Tordesilhas', 'def': 'Acordo de 1494 entre Portugal e Espanha: meridiano a 370 léguas a oeste de Cabo Verde. Terras a leste para Portugal, a oeste para a Espanha.' },
        { 'termo': 'escambo', 'def': 'Troca direta, sem moeda: o trabalho indígena de corte e transporte do pau-brasil por machados, facas, anzóis, espelhos e tecidos.' }
      ],
      'galeria': [
        { 'url': ROTAS, 'legenda': 'As rotas da expansão portuguesa e espanhola' },
        { 'url': DIVISAO, 'legenda': 'Alcáçovas, Inter Coetera e Tordesilhas: a divisão do mundo' },
        { 'url': PAU_BRASIL, 'legenda': 'Áreas de pau-brasil e feitorias em 1500' }
      ],
      'topicos': ['História do Brasil', 'Brasil Colônia'], 'tags': ['expansão marítima', 'Tordesilhas', '1500']
    },
    'video': {
      'lateral': 'Aula: expansão e decolonialidade', 'rotulo': 'Videoaula',
      'titulo': 'Vídeo de abertura: <em>expansão marítima e a perspectiva decolonial</em>',
      'desc': 'A aula real que abre a unidade. A professora percorre a expansão marítima portuguesa nos séculos XIV e XV e faz uma intervenção sobre a História Decolonial: por que termos como "descobrimento" e "período pré-colonial" comprometem uma compreensão atualizada da nossa história.',
      'vimeo': '1206225617?h=9c14b3b443',
      'apresentador': 'Profa. Dra. Cláudia Viscardi', 'apresentadorCargo': 'Professora titular · UFJF',
      'duracao': 'Aula completa', 'transcricao': 'Na plataforma',
      'topicos': ['História do Brasil'], 'tags': ['decolonial', 'expansão marítima']
    },
    'keypoints': {
      'lateral': 'Para não esquecer', 'rotulo': 'Pontos-chave',
      'titulo': 'Para <em>não esquecer</em>', 'desc': 'Seis pontos que amarram a unidade, na ordem do texto.',
      'intro': 'Resumo dos pontos principais, para revisão rápida antes da prova.',
      'itens': [
        { 'label': 'Contexto', 'title': 'A crise que abriu o mar', 'body': 'Peste, fome e guerra no século XIV desestruturam o feudalismo e criam as condições para reis fortes e para a busca de novas rotas.' },
        { 'label': 'Portugal', 'title': 'Estado precoce, política de Estado', 'body': 'Reconquista e Revolução de Avis: a Coroa centralizada, aliada à burguesia, faz da navegação um projeto nacional.' },
        { 'label': 'Motivos', 'title': 'Especiarias, metais e fé', 'body': 'Fome de metais preciosos, mercantilismo, espírito de Cruzada e mentalidade renascentista.' },
        { 'label': 'Meios', 'title': 'Caravela, astrolábio, cartografia', 'body': 'Bolinar contra o vento, medir a latitude pelos astros e guardar os mapas como segredo de Estado.' },
        { 'label': 'África', 'title': 'A escola náutica', 'body': 'Ceuta, Bojador e Boa Esperança: feitorias, ouro e o início do tráfico. A África foi a base do império atlântico.' },
        { 'label': 'Brasil', 'title': 'Tordesilhas antes de Cabral', 'body': 'A linha das 370 léguas (1494) garante a terra. De 1500 a 1530: pau-brasil, escambo e feitorias. Em 1532, São Vicente.' }
      ],
      'topicos': ['História do Brasil'], 'tags': ['resumo']
    },
    'timeline': {
      'lateral': 'Linha do tempo', 'rotulo': 'Linha do tempo',
      'titulo': 'Da crise ao <em>achamento</em>', 'desc': 'Duas trilhas: o caminho de Portugal até a Índia e a divisão do mundo que garantiu o Brasil. Use as setas para alternar.',
      'trilhas': [
        { 'titulo': 'Da crise à Índia', 'sub': 'Trilha 1', 'entradas': [
          { 'ano': '1347–1351', 'titulo': 'Peste Negra', 'body': 'A epidemia dizima um terço da Europa e desestrutura o feudalismo.', 'image': '' },
          { 'ano': '1383–1385', 'titulo': 'Revolução de Avis', 'body': 'Aljubarrota garante a independência e entroniza a Dinastia de Avis.', 'image': '' },
          { 'ano': '1415', 'titulo': 'Conquista de Ceuta', 'body': 'Marco material da expansão: o ouro do Sudão escapa, mas o mar se abre.', 'image': CEUTA },
          { 'ano': '1434', 'titulo': 'Cabo Bojador', 'body': 'Gil Eanes ultrapassa o "mar tenebroso": a experiência vence a lenda.', 'image': '' },
          { 'ano': '1488', 'titulo': 'Cabo da Boa Esperança', 'body': 'Bartolomeu Dias contorna a África e prova que o Índico é alcançável.', 'image': '' },
          { 'ano': '1497–1499', 'titulo': 'Vasco da Gama na Índia', 'body': 'A Rota do Cabo chega a Calicute e volta carregada de especiarias.', 'image': GAMA_IMG }
        ] },
        { 'titulo': 'A divisão do mundo e o Brasil', 'sub': 'Trilha 2', 'entradas': [
          { 'ano': '1479–1480', 'titulo': 'Alcáçovas-Toledo', 'body': 'Primeira partilha do Atlântico: Canárias para a Espanha, o sul para Portugal.', 'image': '' },
          { 'ano': '1492', 'titulo': 'Colombo na América', 'body': 'A Espanha rompe o equilíbrio e força uma nova partilha.', 'image': COLOMBO_MAPA },
          { 'ano': '1494', 'titulo': 'Tratado de Tordesilhas', 'body': 'Meridiano a 370 léguas de Cabo Verde: o Brasil já é português antes de Cabral.', 'image': DIVISAO },
          { 'ano': '1500', 'titulo': 'Cabral avista o Monte Pascoal', 'body': 'Missa, cruz e tomada de posse. Casual ou intencional? O debate segue.', 'image': MISSA },
          { 'ano': '1500–1530', 'titulo': 'Período pré-colonial', 'body': 'Pau-brasil, escambo, feitorias e o arrendamento a Fernão de Loronha.', 'image': PAU_BRASIL },
          { 'ano': '1532', 'titulo': 'São Vicente', 'body': 'Martim Afonso de Sousa funda a primeira vila e instala o primeiro engenho.', 'image': SAO_VICENTE },
          { 'ano': '1534', 'titulo': 'Capitanias Hereditárias', 'body': 'D. João III transfere à iniciativa privada o custo de povoar e defender.', 'image': '' }
        ] }
      ]
    },
    'galeria': {
      'lateral': 'Galeria iconográfica', 'rotulo': 'Galeria',
      'titulo': 'A <em>galeria</em> da unidade', 'desc': 'Pinturas, gravuras e mapas que a banca usa como texto-base. Passe o mouse para ver a ficha.',
      'itens': [
        { 'url': MISSA, 'titulo': 'Primeira Missa no Brasil', 'ref': 'Victor Meirelles · 1860', 'span': 'span-2x2' },
        { 'url': DESEMBARQUE, 'titulo': 'Desembarque de Cabral em Porto Seguro', 'ref': 'Oscar Pereira da Silva · 1900', 'span': '' },
        { 'url': TERRA_BRASILIS, 'titulo': 'Mapa Terra Brasilis', 'ref': 'Lopo Homem e Reinel · 1519', 'span': 'span-1x2' },
        { 'url': STADEN, 'titulo': 'Duas Viagens ao Brasil', 'ref': 'Theodore de Bry · 1557', 'span': '' },
        { 'url': SAO_VICENTE, 'titulo': 'Fundação de São Vicente', 'ref': 'Benedito Calixto · 1900', 'span': 'span-2x1' },
        { 'url': POVOS, 'titulo': 'Povos indígenas do litoral no século XVI', 'ref': 'Mapa etnográfico', 'span': '' }
      ]
    },
    'glossario': {
      'lateral': 'Glossário', 'rotulo': 'Glossário',
      'titulo': 'Conceitos-chave da <em>unidade</em>', 'desc': 'Cinco termos que a banca cobra, com definição e contexto.',
      'termos': [
        { 'termo': 'Estado patrimonial', 'meta': 'Conceito · Raymundo Faoro', 'def': 'Modelo em que não há separação entre o patrimônio público e o do governante.', 'body': 'O rei é soberano e grande gestor econômico; a camada dirigente é um estamento a serviço do príncipe. Explica por que a expansão foi, desde o início, um projeto de Estado.', 'image': '' },
        { 'termo': 'Feitoria', 'meta': 'Economia · séculos XV e XVI', 'def': 'Entreposto comercial fortificado no litoral.', 'body': 'Armazém, ponto de troca e fortaleza ao mesmo tempo. Permitiu explorar a África com presença mínima e serviu de modelo para o Brasil do pau-brasil (Cabo Frio, Pernambuco).', 'image': '' },
        { 'termo': 'Escambo', 'meta': 'Trabalho · 1500–1530', 'def': 'Troca direta de mercadorias, sem moeda.', 'body': 'O trabalho indígena de corte e transporte do pau-brasil era pago com machados, facas, anzóis, espelhos e tecidos. Fazia sentido na lógica tupi, que não acumulava excedentes.', 'image': '' },
        { 'termo': 'Tratado de Tordesilhas', 'meta': 'Diplomacia · 1494', 'def': 'Partilha do mundo entre Portugal e Espanha por um meridiano.', 'body': 'A linha das 370 léguas a oeste de Cabo Verde substituiu a bula papal das 100 léguas. Vitória diplomática de D. João II: garantiu a rota da Índia e o futuro Brasil.', 'image': DIVISAO },
        { 'termo': 'Uti possidetis', 'meta': 'Direito · fronteiras', 'def': 'A posse do território pertence a quem de fato o ocupa.', 'body': 'Como a linha de Tordesilhas era imprecisa, a ocupação efetiva definiu as fronteiras na prática, o que favoreceu a expansão portuguesa para o interior.', 'image': '' }
      ]
    },
    'tabelas': {
      'lateral': 'Tabelas de referência', 'rotulo': 'Tabelas',
      'titulo': 'Dados que a <em>banca cobra</em>', 'desc': 'Quadros da unidade, resumidos. Use as setas para alternar.',
      'tabelas': [
        { 'titulo': 'A partilha do mundo: tratados e bulas', 'colunas': ['Diploma (ano)', 'Delimitação', 'Consequência para Portugal'], 'linhas': [
          ['Tratado de Alcáçovas-Toledo (1479–1480)', 'Canárias para a Espanha; navegação e terras ao sul, para Portugal.', 'Exclusividade do périplo africano.'],
          ['Bula Inter Coetera (1493)', 'Meridiano a 100 léguas a oeste de Açores e Cabo Verde.', 'Inaceitável: ameaçava a rota da Índia.'],
          ['Tratado de Tordesilhas (1494)', 'Meridiano a 370 léguas a oeste de Cabo Verde.', 'Rota da Índia segura e posse do Brasil antes de Cabral.'] ], 'notas': 'A imprecisão de Tordesilhas fez da linha uma fronteira mais teórica que prática.' },
        { 'titulo': 'O período pré-colonial (1500–1530)', 'colunas': ['Característica', 'Descrição', 'Agentes'], 'linhas': [
          ['Atividade econômica', 'Extração predatória e litorânea do pau-brasil, corante para tecidos de luxo.', 'Indígenas, arrendatários e Coroa'],
          ['Relação de trabalho', 'Escambo: trabalho indígena por machados, facas, anzóis e miçangas.', 'Povos tupi e feitores'],
          ['Modelo de ocupação', 'Feitorias fortificadas na costa, sem povoamento.', 'Coroa e arrendatários'],
          ['Ameaça externa', 'Corsários franceses aliados a tribos, que não reconheciam Tordesilhas.', 'Franceses, tupinambás, guarda-costas'] ], 'notas': 'Sem metais preciosos à vista, o Brasil ficou em segundo plano diante das especiarias do Oriente.' }
      ]
    },
    'biografias': {
      'lateral': 'Biografias', 'rotulo': 'Biografias',
      'titulo': 'As <em>pessoas</em> por trás dos eventos', 'desc': 'Quatro retratos: datas, papéis e uma linha-síntese.',
      'pessoas': [
        { 'nome': 'Infante D. Henrique', 'datas': '1394–1460', 'papeis': ['O Navegador', 'Grão-Mestre da Ordem de Cristo'], 'resumo': 'O grande arquiteto da expansão: patrono e financiador que transformou a aventura oceânica numa ciência aplicada, sem a "Escola de Sagres" formal que a lenda inventou.', 'retrato': HENRIQUE },
        { 'nome': 'Vasco da Gama', 'datas': 'c. 1469–1524', 'papeis': ['Navegador', 'Comandante'], 'resumo': 'Fez a volta do mar, contornou a Boa Esperança e chegou a Calicute em 1498: a Rota do Cabo provou-se viável e lucrativa.', 'retrato': GAMA },
        { 'nome': 'Cristóvão Colombo', 'datas': '1451–1506', 'papeis': ['Navegador genovês', 'A serviço da Espanha'], 'resumo': 'Rejeitado por Portugal, convenceu os Reis Católicos a buscar as Índias pelo oeste. Em 1492 rompeu o equilíbrio de Alcáçovas.', 'retrato': COLOMBO },
        { 'nome': 'Pedro Álvares Cabral', 'datas': 'c. 1467–1520', 'papeis': ['Fidalgo', 'Comandante da esquadra de 1500'], 'resumo': 'Treze navios e cerca de 1.500 homens rumo à Índia. Em 22 de abril de 1500, o Monte Pascoal: casual ou intencional?', 'retrato': '' }
      ]
    },
    'citacoes': {
      'lateral': 'Citações', 'rotulo': 'Citações',
      'titulo': 'Citações <em>que caem</em>', 'desc': 'Excertos recorrentes em provas, com a fonte.',
      'itens': [
        { 'texto': 'Pardos, todos nus, sem nenhuma coisa que lhes cobrisse suas vergonhas.', 'autor': 'Pero Vaz de Caminha', 'ctx': 'Carta a el-Rei D. Manuel, 1500', 'retrato': '', 'bg': DESEMBARQUE },
        { 'texto': 'Em tal maneira é graciosa que, querendo-a aproveitar, dar-se-á nela tudo.', 'autor': 'Pero Vaz de Caminha', 'ctx': 'Carta a el-Rei D. Manuel, 1500', 'retrato': '', 'bg': MISSA },
        { 'texto': 'O rei não era apenas o soberano, mas também o senhor e o grande gestor econômico do reino.', 'autor': 'Raymundo Faoro', 'ctx': 'Os Donos do Poder, 1958', 'retrato': '', 'bg': TERRA_BRASILIS }
      ]
    },
    'bibliografia': {
      'lateral': 'Bibliografia', 'rotulo': 'Bibliografia',
      'titulo': 'Bibliografia <em>da unidade</em>', 'desc': 'As referências que sustentam o texto, com o porquê de cada uma.',
      'itens': [
        { 'ref': 'FAUSTO, Boris. <em>História do Brasil</em>. São Paulo: Edusp, 2022.', 'porque': 'Síntese consensual. A banca testa o vocabulário e a periodização deste manual.' },
        { 'ref': 'LINHARES, Maria Yedda (org.). <em>História Geral do Brasil</em>. Rio de Janeiro: Elsevier, 2016.', 'porque': 'Visão de conjunto da colonização, útil para discursivas sobre o sistema colonial.' },
        { 'ref': 'SCHWARCZ, Lilia M.; STARLING, Heloisa M. <em>Brasil: uma biografia</em>. São Paulo: Companhia das Letras, 2015.', 'porque': 'Narrativa atualizada, atenta aos povos originários e à crítica do "descobrimento".' },
        { 'ref': 'FAORO, Raymundo. <em>Os Donos do Poder</em>. São Paulo: Globo, 2001.', 'porque': 'Origem do conceito de Estado patrimonial, recorrente em questões sobre o pioneirismo luso.' },
        { 'ref': 'GOES FILHO, Synesio Sampaio. <em>Navegantes, bandeirantes, diplomatas</em>. Brasília: FUNAG, 2015.', 'porque': 'Tordesilhas e o uti possidetis pela ótica da diplomacia, o que o CACD adora.' },
        { 'ref': 'CALMON, Pedro. <em>História do Brasil: século XVI</em>. Kírion, 2023.', 'porque': 'Detalhe dos primeiros anos, incluindo a controvérsia do arrendamento a Loronha.' }
      ]
    },
    'quiz': {
      'lateral': 'Questões objetivas', 'rotulo': 'Questões objetivas',
      'titulo': 'Questões sobre a <em>chegada ao Brasil</em>', 'desc': 'Texto-base, enunciado e três itens no padrão Cebraspe. Clique em C ou E: o gabarito comentado aparece depois da sua resposta.',
      'textoBase': { 'label': 'Texto-base I', 'titulo': 'CAMINHA, Pero Vaz de. Carta a el-Rei D. Manuel, 1500.', 'corpo': '"Pardos, todos nus, sem nenhuma coisa que lhes cobrisse suas vergonhas. (...) Em tal maneira é graciosa que, querendo-a aproveitar, dar-se-á nela tudo."', 'fonte': 'Trechos citados na unidade.', 'imagem': DESEMBARQUE },
      'comando': 'Com base no texto e nos conhecimentos sobre a expansão portuguesa, julgue os itens a seguir como Certo (C) ou Errado (E).',
      'itens': [
        { 'correta': 'E', 'enunciado': 'O Tratado de Tordesilhas (1494) manteve o meridiano de 100 léguas a oeste de Açores e Cabo Verde, fixado pela Bula Inter Coetera no ano anterior.', 'comentario': 'Errado. A bula fixava 100 léguas; Tordesilhas moveu a linha para 370 léguas a oeste de Cabo Verde, o que garantiu a Portugal a rota da Índia e o futuro Brasil.', 'dif': 'Fácil', 'ref': 'Questão Ubique' },
        { 'correta': 'C', 'enunciado': 'No período pré-colonial (1500–1530), a exploração do pau-brasil foi organizada como monopólio régio, arrendado a particulares e apoiado em feitorias e no escambo com os povos tupi.', 'comentario': 'Certo. O estanco real foi arrendado a consórcios como o de Fernão de Loronha; as feitorias armazenavam a madeira e o escambo pagava o trabalho indígena com objetos europeus.', 'dif': 'Regular', 'ref': 'Questão Ubique' },
        { 'correta': 'E', 'enunciado': 'A decisão portuguesa de colonizar efetivamente o Brasil, a partir de 1530, decorreu sobretudo da descoberta de metais preciosos no litoral.', 'comentario': 'Errado. Não havia metais à vista. A virada veio da ameaça francesa, que não reconhecia Tordesilhas, e da queda dos lucros do comércio oriental.', 'dif': 'Regular', 'ref': 'Questão Ubique' }
      ]
    },
    'discursiva': {
      'lateral': 'Discursiva', 'rotulo': 'Discursiva',
      'titulo': 'Discursiva: o <em>pioneirismo português</em>', 'desc': 'Escreva à esquerda. Os critérios, com a avaliação integrada, e a resposta-modelo aparecem à direita.',
      'comando': 'Explique por que Portugal foi pioneiro na expansão marítima europeia, relacionando a <strong>centralização política precoce</strong>, a aliança com a burguesia mercantil e as condições técnicas. <em>(máx. 30 linhas)</em>',
      'meta': { 'total': '10 pts', 'limite': '2500 caracteres', 'prova': 'Questão Ubique' },
      'criterios': [
        { 'label': 'Domínio do conteúdo', 'max': 4, 'description': 'Reconquista, Revolução de Avis e Estado patrimonial articulados ao pioneirismo, com datas e conceitos precisos.', 'model': 'Espera-se a centralização precoce (Reconquista, Aljubarrota, Dinastia de Avis) como base do projeto de Estado, com a burguesia como parceira subordinada.', 'score': 3.5, 'comment': 'Boa articulação entre Avis e a política de Estado. Faltou nomear o conceito de Faoro.' },
        { 'label': 'Coesão argumentativa', 'max': 2, 'description': 'Tese explícita, progressão temática e conectivos que amarram os fatores.', 'model': 'Tese na introdução, um fator por parágrafo e retomada na conclusão.', 'score': 1.8, 'comment': 'Progressão clara. Tese explícita no primeiro parágrafo.' },
        { 'label': 'Estrutura', 'max': 2, 'description': 'Introdução contextualizadora, desenvolvimento em camadas e conclusão com fechamento.', 'model': 'Introdução situa a crise do século XIV; desenvolvimento cobre política, economia e técnica; conclusão liga tudo ao périplo africano.', 'score': 1.5, 'comment': 'Conclusão curta demais para o peso do argumento.' },
        { 'label': 'Historiografia', 'max': 1, 'description': 'Menção a pelo menos um autor consagrado (Faoro, Fausto, Schwarcz e Starling).', 'model': 'A referência a Raymundo Faoro costuma render o ponto.', 'score': 0.5, 'comment': 'Faoro aparece só de passagem.' },
        { 'label': 'Correção formal', 'max': 1, 'description': 'Norma culta, pontuação, concordância e regência.', 'model': 'Texto em norma culta, sem desvios notáveis.', 'score': 0.8, 'comment': 'Um desvio de concordância no terceiro parágrafo.' }
      ],
      'modelos': [
        { 'title': 'Modelo · abordagem por fatores', 'author': 'Exemplo escrito para a demonstração', 'score': '9/10', 'body': 'O pioneirismo português na expansão marítima resulta da conjunção de fatores políticos, econômicos e técnicos, todos anteriores aos de seus vizinhos. No plano político, a formação de Portugal na Reconquista e a Revolução de Avis (1383–1385) produziram uma monarquia centralizada e estável, capaz de conceber um projeto de longo prazo enquanto França e Inglaterra se digladiavam e a Espanha ainda se unificava.\n\nNo plano econômico, a Dinastia de Avis nasceu aliada à burguesia mercantil de Lisboa e do Porto, interessada nas rotas atlânticas. Essa burguesia forneceu navios e capital, mas atuou como parceira subordinada de um Estado patrimonial, no sentido de Raymundo Faoro, em que a Coroa era a principal investidora e beneficiária da empresa ultramarina.\n\nNo plano técnico, a caravela, a navegação astronômica e a cartografia, tratadas como segredo de Estado, deram a Portugal a capacidade de executar o périplo africano de forma metódica. A convergência desses fatores explica por que um reino pequeno chegou primeiro à Índia e, por Tordesilhas, garantiu o Brasil antes mesmo de 1500.' }
      ]
    },
    'flashcards': {
      'lateral': 'Flashcards', 'rotulo': 'Flashcards',
      'titulo': 'Flashcards da <em>unidade</em>', 'desc': 'Clique em qualquer cartão para virar. Marque Rever ou Dominei para alimentar a repetição espaçada.',
      'dica': 'Clique no cartão para virar · marque Rever ou Dominei para atualizar o estado',
      'cards': [
        { 'frente': 'Revolução de <em>Avis</em>', 'verso': '<strong>1383–1385.</strong> Crise sucessória; burguesia e povo apoiam o Mestre de Avis contra Castela. Aljubarrota (1385) entroniza a nova dinastia.' },
        { 'frente': 'Tratado de <em>Tordesilhas</em>', 'verso': '<strong>1494.</strong> Meridiano a 370 léguas a oeste de Cabo Verde. Substituiu as 100 léguas da Bula Inter Coetera (1493).' },
        { 'frente': '<em>Feitoria</em>', 'verso': 'Entreposto fortificado no litoral: armazém, ponto de escambo e defesa. Da África para o Brasil do <strong>pau-brasil</strong>.' },
        { 'frente': '<em>Escambo</em>', 'verso': 'Troca direta sem moeda: trabalho indígena por <strong>machados, facas, anzóis</strong> e miçangas.' },
        { 'frente': '<em>Uti possidetis</em>', 'verso': 'A posse pertence a quem ocupa de fato. Definiu as fronteiras onde Tordesilhas era <strong>impreciso</strong>.' },
        { 'frente': 'Estado <em>patrimonial</em>', 'verso': 'Raymundo Faoro: sem separação entre o patrimônio público e o do rei. A expansão como <strong>projeto de Estado</strong>.' }
      ]
    },
    'forum': {
      'lateral': 'Fórum da unidade', 'rotulo': 'Fórum',
      'titulo': 'Fórum da <em>unidade</em>', 'desc': 'Discussão ancorada em cada unidade, com outros candidatos e monitores.',
      'pergunta': 'A chegada de Cabral foi casual ou intencional? E o que muda dizer "achamento" em vez de "descobrimento"?',
      'posts': [
        { 'iniciais': 'AB', 'nome': 'Ana Beatriz', 'quando': 'há 5 dias', 'texto': 'A tese da intencionalidade me convence pelo conhecimento náutico que Portugal já tinha do Atlântico Sul. Tordesilhas garantia a terra; a esquadra de 1500 só foi tomar posse.', 'resposta': { 'iniciais': 'CE', 'nome': 'Carlos Eduardo', 'quando': 'há 4 dias', 'texto': 'Concordo, Ana. Treze navios e 1.500 homens é muito para uma simples passagem. Mas os documentos oficiais não trazem ordem explícita, e a banca gosta desse contraponto.' } },
        { 'iniciais': 'FL', 'nome': 'Fernanda Lima', 'quando': 'há 3 dias', 'texto': '"Achamento" é a palavra do próprio Caminha e sugere encontro. "Descobrimento" apaga milhões de pessoas que já viviam aqui. Na discursiva, vale marcar essa escolha de vocabulário.', 'resposta': { 'iniciais': 'RS', 'nome': 'Rafael Souza', 'quando': 'há 2 dias', 'texto': 'Ótimo ponto. Schwarcz e Starling tratam disso, e a unidade traz a versão atualizada do debate no apêndice.' } }
      ]
    }
  }
}
