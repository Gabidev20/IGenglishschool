# Contas de professora (Supabase)

Hoje o site funciona **sem login**: uma professora, tudo salvo neste navegador.
Para várias professoras — cada uma com os próprios alunos, diário de aula,
boletins e jogos — siga os passos abaixo.

Este guia já assume o seu caso: **reaproveitar o projeto Supabase do
Financeiro**, já que o plano gratuito só permite 2 projetos.

---

## Escolha uma das duas formas

As duas isolam o site do Financeiro do mesmo jeito e protegem os dados
igualmente (Row Level Security por professora). A diferença é só **onde as
tabelas moram** — e quanto trabalho de configuração dá.

| | **B — prefixo no `public`** ✅ recomendada | **A — schema próprio** |
|---|---|---|
| Arquivo SQL | `supabase-schema-public.sql` | `supabase-schema.sql` |
| Tabelas | `public.igenglish_students` | `igenglish.students` |
| Configurar no painel | **nada** | precisa liberar o schema na API |
| Passos | 2 | 3 |

Você já rodou o SQL da opção A (o schema `igenglish` aparece no painel) e
travou justamente no passo de liberar o schema. **A opção B pula esse passo.**

---

# Opção B — prefixo no `public` (recomendada)

## 1. Rodar o SQL

**SQL Editor** → **New query** → cole todo o
[`supabase-schema-public.sql`](supabase-schema-public.sql) → **Run**.

No fim ele imprime uma conferência: devem aparecer **7 tabelas `igenglish_*`**,
todas com `rowsecurity = true`.

> Como você já criou o schema `igenglish` e ele está vazio, dá para apagá-lo
> junto: descomente a primeira linha do arquivo
> (`drop schema if exists igenglish cascade;`). O site do Financeiro não sente
> nada — o schema dele é o `public`.

## 2. Ligar o site ao projeto

**Settings** → **API**, copie os dois valores e cole em
[`supabaseConfig.js`](supabaseConfig.js):

```js
const SUPABASE_URL = 'https://xxxxxxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6...';
```

As duas linhas de baixo já vêm certas para esta opção — não precisa mexer:

```js
const SUPABASE_SCHEMA = 'public';
const SUPABASE_TABLE_PREFIX = 'igenglish_';
```

Salve, recarregue o site, e a tela de login aparece. **Acabou.**

---

# Opção A — schema próprio

Só se você preferir as tabelas fora do `public`. O SQL você já rodou; falta o
passo que travou.

## Onde fica "Exposed schemas"

**O painel do Supabase mudou de lugar em 2026** — por isso você não achou.
Hoje é:

**Integrations** → **Data API** → **Settings** → **Exposed schemas**

(nos painéis antigos era *Settings → API → Exposed schemas*)

Link direto, que abre no seu projeto atual:
<https://supabase.com/dashboard/project/_/settings/api>

O campo já vem com `public, graphql_public`. É só **somar** o novo, ficando
`public, graphql_public, igenglish`, e salvar. Não apague os que já estão lá —
o `public` é o que o Financeiro usa.

Depois, em `supabaseConfig.js`:

```js
const SUPABASE_SCHEMA = 'igenglish';
const SUPABASE_TABLE_PREFIX = '';
```

> Se esquecer esse passo, o site mostra exatamente esta instrução na tela de
> login, em vez de um erro técnico.

---

## Por que é seguro rodar no banco do Financeiro

- **Nada encosta nas tabelas dele.** Na opção B os `GRANT` são dados
  **tabela a tabela**, nunca um `grant on all tables in schema public` — que
  daria acesso às tabelas financeiras também. Na opção A tudo vive fora do
  `public`.
- **Nenhum dos dois scripts cria ou apaga nada em `auth.users`.** Isso é
  proposital: quase todo tutorial de Supabase manda criar um trigger chamado
  `on_auth_user_created` precedido de `drop trigger if exists`. Se o
  Financeiro usa esse nome — o mais provável —, rodar um script desses
  **apagaria o trigger dele** e quebraria os cadastros daquele site, sem aviso
  nenhum. Aqui o perfil da professora é criado pelo próprio site no primeiro
  login.
- **A sessão de login é separada no navegador.** Cada site guarda a sua sob
  uma chave diferente, então abrir os dois ao mesmo tempo não derruba nenhum.

---

## O que dividir o projeto **não** isola

**O login é compartilhado.** `auth.users` é único por projeto Supabase:

- quem já tem conta no Financeiro entra aqui com o mesmo e-mail e senha — e
  cai numa área **vazia e nova**, sem enxergar nada de ninguém;
- quem criar conta aqui também passa a existir lá.

Se o público é o mesmo (você e as suas professoras), isso é conveniente: uma
senha só. Se são públicos diferentes e você não quer a mistura, aí sim vale um
projeto separado — é o único ponto em que dividir o banco não resolve.

Os **dados** continuam totalmente isolados: alunos, estrelas, diário, boletins
e jogos só aparecem para a professora dona deles, por regra do banco.

---

## Como fica para as professoras

- **Criar conta** na própria tela de login (nome, e-mail e senha).
- Cada uma começa com a lista de alunos padrão e a partir dali monta a sua.
- Alunos, estrelas, diário de aula, boletins, jogos do Game Maker e edições no
  Editor de Conteúdos ficam **separados por professora**.
- Os dados acompanham a professora em qualquer computador ou celular.

### Confirmação de e-mail

Por padrão o Supabase pede confirmação por e-mail no cadastro. Para uma escola
pequena costuma ser mais prático desligar:

**Authentication** → **Providers** → **Email** → desmarque *Confirm email*.

⚠️ Vale para o **projeto inteiro**, ou seja, afeta o Financeiro também. Se ele
depende da confirmação, deixe ligada — o site já mostra a mensagem certa
("confira seu e-mail") para a professora.

### Limitar quem pode se cadastrar

**Authentication** → **Providers** → **Email** → desligue *Enable sign ups*, e
crie as professoras em **Authentication** → **Users** → **Add user**. (Idem:
vale para o projeto inteiro.)

---

## Como a sincronização funciona

O site **sempre lê do navegador**, nunca espera a internet para desenhar a
tela:

- ao abrir, a tela aparece na hora com os dados já salvos no aparelho;
- em seguida, o que mudou em outro dispositivo é baixado e a tela se atualiza;
- cada alteração sobe para a nuvem em segundo plano.

Ou seja: **se a internet cair no meio da aula, nada para e nada se perde.** As
estrelas continuam sendo dadas e salvas no aparelho, e sobem sozinhas quando a
conexão voltar. O chip da professora no topo mostra o estado
(*Synced* / *Saving…* / *Offline — saved here*), e há um **🔄 Sync now** no menu.

Duas coisas ficam só no aparelho de propósito, porque são "onde eu estou
agora" e não histórico: qual aluno está selecionado e a pontuação da aula em
andamento.

---

## Se algo der errado

| O que aparece | O que fazer |
|---|---|
| "As tabelas ainda não existem…" | Rode o `.sql` da opção que você escolheu. |
| "O schema `igenglish` não está liberado na API" | Opção A, passo do *Exposed schemas* — ou mude para a opção B. |
| "Wrong email or password" | Senha errada, ou a conta é do Financeiro com outra senha. |
| "Confirm your email first" | Clique no link do e-mail, ou desligue a confirmação. |
| Chip mostra "Offline — saved here" | Sem internet. Nada se perdeu; sobe sozinho depois. |

---

## Voltar ao modo sem login

Apague os dois valores de `supabaseConfig.js` e recarregue. O site volta a
funcionar como antes, com os dados locais.

## Remover este site do banco depois

Opção B:

```sql
drop table if exists
  public.igenglish_teachers,
  public.igenglish_students,
  public.igenglish_student_progress,
  public.igenglish_class_sessions,
  public.igenglish_reports,
  public.igenglish_custom_games,
  public.igenglish_curriculum_overrides
cascade;
```

Opção A:

```sql
drop schema igenglish cascade;
```

Nos dois casos o Financeiro não sente nada.
