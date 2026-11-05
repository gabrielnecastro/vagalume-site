# Vagalume — um site de vagas feito para ser testado

🇺🇸 [English](README.md) · 🇧🇷 Português

![Página inicial do Vagalume](screenshots/home.png)

O Vagalume é um site de vagas fictício, com um pequeno marketplace de cursos, feito como **alvo
para praticar testes de software**. Ele parece e se comporta como um produto real, mas cada
fluxo foi pensado para exercitar um tipo de cenário de teste, de um formulário simples a um
gateway de pagamento que falha de propósito.

Ele roda localmente em poucos minutos, com um banco de dados real que você controla por
completo, para você praticar verificações de UI, API e dados sem quebrar nada que importe.

> **Vibe coded:** este site foi construído com ajuda de IA, como alvo para praticar testes. Ele não é uma referência de código para produção.

## Por que testar o Vagalume

- **Fluxos realistas:** dois tipos de conta (candidato e empresa), painéis, candidaturas, avaliações, carrinho e checkout.
- **Um oráculo de teste claro:** o [QA Guide](#o-qa-guide) descreve o comportamento esperado, então você sabe o que é intencional e o que é defeito.
- **Falhas de propósito:** erros aleatórios, respostas lentas e rate limits para praticar esperas, retentativas e tratamento de erros.
- **As mesmas regras na UI e na API:** a tela bloqueia dados inválidos e a API aplica as mesmas regras, então você pode pular a UI e verificar as duas camadas.
- **Marcação pensada para testes:** quase todo elemento interativo tem o atributo `data-testid`.
- **Controle total dos dados:** PostgreSQL no Docker, com dados demo que você pode resetar a qualquer momento e consultar direto.
- **Uma API documentada:** todos os endpoints no [Swagger](#documentação-da-api-swagger), prontos para explorar ou importar.

## Tecnologias

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![OpenAPI](https://img.shields.io/badge/OpenAPI-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white)

| Camada | Tecnologia |
| --- | --- |
| Front end | HTML, CSS e JavaScript puro (sem framework), com um Web Component nas estrelas de avaliação |
| Back end | [Node.js](https://nodejs.org) 22 e [Express](https://expressjs.com) 4 (API REST) |
| Banco de dados | [PostgreSQL](https://www.postgresql.org) 16 no [Docker](https://www.docker.com), acessado com SQL puro ([node-postgres](https://node-postgres.com)) |
| Autenticação | JWT em cookie httpOnly para usuários; HTTP Basic Auth para o admin; senhas com hash scrypt |
| Upload de arquivos | [Multer](https://github.com/expressjs/multer) (multipart/form-data) |
| Documentação da API | [OpenAPI](https://www.openapis.org) 3 com [Swagger UI](https://swagger.io/tools/swagger-ui/) |

## O que você pode praticar

| Tema | Onde no Vagalume |
| --- | --- |
| Formulários e validação | Cadastro com dois perfis e login (`/pages/entrar.html`) |
| Autenticação e perfis | Cookie de sessão httpOnly; permissões de candidato e empresa (401 e 403) |
| Busca, filtros, ordenação e paginação | Lista de vagas na página inicial e `GET /api/jobs` |
| CRUD | Vagas no painel da empresa; experiências no painel do candidato |
| Drag and drop | Kanban de candidatos no painel da empresa |
| Upload e download de arquivos | Upload de currículo (.pdf, .doc, .docx até 5 MB); candidatos exportados em CSV |
| Carrinho e checkout | Marketplace de cursos: cupons, um curso grátis e "já matriculado" (409) |
| Elementos de UI difíceis | iframe, shadow DOM (estrelas de avaliação), banner de cookies, tema no `localStorage`, imagem quebrada, página 404, redirect 302 |
| Comportamento instável e lento | O checkout falha ~15% das vezes (502), uma ação do admin falha ~35% (500), uma ação do admin de 2,5 a 4 s |
| Rate limits | Cupom (5 tentativas / 30 s), webhook do admin e `/api/rate-limited` (5 / 10 s), com `Retry-After` |
| Testes de API | 60 operações documentadas, com respostas 400, 401, 403, 404, 409, 422, 429 e 502 |
| Testes de contrato | O arquivo OpenAPI ([`openapi.yaml`](openapi.yaml)) |
| Controle de acesso | Usuários só podem alterar ou apagar os próprios dados; o admin usa HTTP Basic Auth |
| Verificação de dados | Confirmar no banco o que a tela não consegue mostrar |
| Carga e performance | Endpoints de catálogo e busca, além de `/api/slow`, `/api/flaky` e `/api/status/:code` |

## Documentação de QA

A pasta [`docs/`](docs/README.md) tem o meu trabalho de QA na área do candidato: uma especificação funcional escrita a partir do código-fonte, com cada regra confirmada no app rodando, na tela e pela API. A documentação está em inglês.

| Histórias de usuário | Regras de negócio | Requisitos funcionais | Divergências tela vs. API | Novos achados |
| :---: | :---: | :---: | :---: | :---: |
| **26** | **44** | **48** | **10** | **24** |

**Comece por aqui:**

- [Especificação funcional](docs/README.md): o que a área do candidato faz, módulo por módulo, com critérios de aceite em Gherkin;
- [Divergências tela vs. API](docs/divergences.md): onde a tela aplicava uma regra e a API não, mais os novos achados;
- [Decisões e correções](docs/decisions.md): o que foi decidido sobre cada ponto e o que foi corrigido;
- [Relatórios de validação](docs/results/validation/README.md): as evidências de cada rodada de validação.

A loja de cursos, a área da empresa e o painel admin ficam fora do escopo por enquanto; serão cobertos numa próxima rodada. Os testes automatizados ficam em repositórios próprios.

## Como começar

### 1. Instale os pré-requisitos

| Ferramenta | Versão | Como conferir |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 22 ou superior (definida no `.nvmrc`) | `node -v` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | qualquer versão recente | `docker --version` |
| [Git](https://git-scm.com) | qualquer versão recente | `git --version` |

**O Docker Desktop precisa estar aberto e rodando** antes dos próximos passos: o banco roda dentro dele.

### 2. Baixe o código e instale as dependências

```bash
git clone https://github.com/gabrielnecastro/vagalume-site.git
cd vagalume-site
npm install
```

### 3. Suba o banco de dados

```bash
npm run db:up
```

Na primeira vez, isso baixa o PostgreSQL 16, cria as tabelas e carrega os dados demo.
O comando termina quando o banco está pronto.

### 4. Suba o site

```bash
npm start
```

Quando aparecer `Vagalume (QA Playground) running at http://localhost:3000`, abra:

| O quê | Endereço |
| --- | --- |
| O site | http://localhost:3000 |
| QA Guide | http://localhost:3000/pages/qa-docs.html |
| Documentação da API (Swagger) | http://localhost:3000/api-docs |
| Painel admin (`admin` / `admin123`) | http://localhost:3000/admin |

### 5. Pare tudo

Aperte `Ctrl + C` no terminal onde o site está rodando e pare o banco com `npm run db:down`.
Seus dados ficam guardados para o próximo `npm run db:up`. Para recomeçar com os dados demo, rode `npm run db:reset`.

### Solução de problemas

| Problema | Solução |
| --- | --- |
| `Could not connect to PostgreSQL` ao subir o site | Abra o Docker Desktop e rode `npm run db:up` de novo |
| A porta 5432 já está em uso (outro PostgreSQL na sua máquina) | Copie o `.env.example` para `.env` e mude o `POSTGRES_PORT` **e** a porta no `DATABASE_URL` (ex.: para 5433), depois rode `npm run db:up` |
| A porta 3000 já está em uso | Rode o site em outra porta: `PORT=4000 npm start` (macOS/Linux) ou `$env:PORT=4000; npm start` (Windows PowerShell) |
| `The container name "/vagalume-db" is already in use` | Existe uma cópia antiga do container do banco: rode `docker rm -f vagalume-db` e depois `npm run db:up` |
| Os dados parecem errados ou um teste deixou bagunça | `npm run db:reset` (ele **apaga tudo** e recarrega os dados demo) |

## Contas e dados de teste

| Uso | Credenciais |
|---|---|
| Conta de candidato (`/pages/entrar.html`) | `candidato@vagalume.test` / `demo123` |
| Conta de empresa — Nimbus Tech (`/pages/entrar.html`) | `empresa@vagalume.test` / `demo123` |
| Segunda conta de empresa — Arctic Games (`/pages/entrar.html`) | `empresa2@vagalume.test` / `demo123` |
| Outros candidatos (autores das avaliações de exemplo) | `fernanda@example.com` / `pass123` e `ricardo@example.com` / `pass123` |
| Painel admin (`/admin`, HTTP Basic Auth) | `admin` / `admin123` |
| Cupons de curso (carrinho) | `STUDENT10` (10%), `LAUNCH20` (20%), `CAREER5` (5%) |

Dicas para testes confiáveis:

- **Crie suas próprias contas** para testes que alteram dados (`POST /api/auth/register` é o jeito mais rápido) e mantenha as contas demo como estão.
- **Volte a um estado conhecido** a qualquer momento com `npm run db:reset`.
- **Prepare e confira dados no banco** quando a tela não for suficiente (veja [Banco de dados](#banco-de-dados)).

## O QA Guide

O site tem um guia próprio para quem testa em **[`/pages/qa-docs.html`](http://localhost:3000/pages/qa-docs.html)**
(o link "QA Guide" no rodapé). Ele é a referência do que o site deve fazer:

- **Credenciais** das contas demo e do painel admin;
- **Cenários de UI** e onde encontrar cada um;
- **Falhas de propósito**, feitas para serem encontradas e tratadas pelos testes;
- **API REST**: todos os endpoints, com a autenticação de cada um (cookie de sessão ou HTTP Basic Auth) e suas regras.

![Página do QA Guide](screenshots/qa-guide.png)

O comportamento descrito no guia, incluindo as falhas de propósito, é intencional.
Qualquer outra coisa diferente dele é um defeito, e encontrar um faz parte da prática.

## Documentação da API (Swagger)

Toda a API REST está documentada no [`openapi.yaml`](openapi.yaml) (OpenAPI 3) e pode ser explorada
e chamada em **[`/api-docs`](http://localhost:3000/api-docs)** enquanto o site está rodando.

- **Rotas com sessão**: rode o `POST /api/auth/login` em "Try it out"; o navegador guarda o
  cookie `session` e o envia nas próximas chamadas.
- **Rotas de admin**: clique em **Authorize** e use `admin` / `admin123`.
- O arquivo também pode ser importado no Postman, no Insomnia ou em outras ferramentas de API.

## Banco de dados

Todos os dados (empresas, vagas, usuários, candidaturas, avaliações, cursos, pedidos...) ficam em um
banco **PostgreSQL 16** rodando no Docker (`docker-compose.yml`). Os dados **sobrevivem a reinícios
do servidor**; eles só são apagados quando você reseta o banco.

| Comando | O que faz |
|---|---|
| `npm run db:up` | Sobe o Postgres (espera até ele estar pronto) |
| `npm run db:down` | Para o Postgres — os dados ficam guardados no volume `vagalume-pgdata` |
| `npm run db:reset` | **Apaga tudo** e recria as tabelas + os dados demo |
| `npm run db:psql` | Abre um shell `psql` dentro do container |
| `npm run db:logs` | Acompanha os logs do banco |

O schema e os dados demo são SQL puro em `db/init/` (`01-schema.sql`, `02-seed.sql`). O Postgres
roda esses arquivos automaticamente **só quando o volume está vazio** — depois de editá-los, rode `npm run db:reset`.

### Dados de conexão

| | Valor |
|---|---|
| Host | `localhost` |
| Porta | `5432` |
| Banco | `vagalume` |
| Usuário / senha | `vagalume` / `vagalume` |
| Connection string | `postgres://vagalume:vagalume@localhost:5432/vagalume` |

Para mudar algum deles (ex.: a porta 5432 já está em uso por outro Postgres na sua máquina), copie o
`.env.example` para `.env` e edite — tanto o Docker Compose quanto o app leem esse arquivo. O app usa a
variável `DATABASE_URL`.

> Os nomes das colunas estão em camelCase (`companyId`, `createdAt`...), então em SQL puro eles precisam
> de aspas duplas: `SELECT * FROM jobs WHERE "companyId" = 1`.

## Estrutura do projeto

```
server.js           servidor Express (rotas do site + API)
database.js         camada de dados PostgreSQL (node-postgres, SQL puro)
docker-compose.yml  container do PostgreSQL 16
openapi.yaml        documentação da API REST (servida pelo Swagger UI em /api-docs)
db/init/            01-schema.sql (tabelas) e 02-seed.sql (dados demo), rodados na primeira subida
.env.example        configurações de conexão (copie para .env para alterar)
public/          o site (sem autenticação de acesso)
  index.html     página inicial com a lista completa de vagas
  pages/
    vaga.html, empresa.html, empresas.html, entrar.html
    candidato/painel.html   painel do candidato (currículo, preferências, candidaturas, meus cursos...)
    empresa/painel.html     painel da empresa (vagas, kanban de candidatos, avaliações recebidas...)
    cursos.html, curso.html, carrinho.html, checkout-curso.html, pedido-curso-confirmado.html
    ajuda.html, termos.html, privacidade.html, qa-docs.html
  css/, js/, img/, img/courses/
docs/            documentação de QA (especificação, divergências, decisões, relatórios de validação)
admin/           painel admin (fica fora de /public — só é servido com HTTP Basic Auth)
uploads/         arquivos enviados pelo app (currículos, logos)
screenshots/     imagens usadas neste README
```

## Licença

[MIT](LICENSE)
