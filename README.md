# DEMO_TC — TechCampus

Versão demonstrativa do sistema de gestão de associações educacionais.

## Requisitos

- Node.js LTS
- npm
- Windows: execute `INICIAR.bat`
- Linux/macOS: utilize os comandos abaixo.

## Primeira execução no Windows

1. Baixe ou atualize a pasta da DEMO_TC.
2. Execute `INICIAR.bat`.
3. O inicializador cria o arquivo local `.env` a partir de `.env.example`, instala as dependências e prepara o banco.
4. Na primeira execução, uma senha aleatória para `admin@techcampus.com` é gerada, salva no `.env` e exibida uma única vez no terminal. Guarde-a.
5. Acesse **http://localhost:3022/**.

## Primeira execução no Linux Mint / macOS

Execute o inicializador incluído no repositório:

```bash
chmod +x INICIAR-Linux.sh
./INICIAR-Linux.sh
```

O script cria o `.env` a partir de `.env.example` quando necessário, instala as dependências, prepara o banco e a conta administrativa e inicia o servidor. Na primeira preparação, a senha administrativa gerada é exibida uma única vez no terminal. Guarde-a. O endereço padrão é **http://localhost:3022/**.

Se preferir iniciar manualmente:

```bash
cp .env.example .env
npm install
npm run setup
npm start
```

### Acesso pelo APP-TC-IoT em um celular físico

1. Deixe o notebook e o celular na mesma rede Wi-Fi.
2. Inicie a DEMO_TC com `./INICIAR-Linux.sh`.
3. Descubra o IPv4 do notebook com `hostname -I`.
4. No arquivo `.env` da raiz do APP-TC-IoT, configure `EXPO_PUBLIC_API_URL=http://IP_DO_NOTEBOOK:3022`, substituindo pelo IP real.
5. Teste no navegador do celular `http://IP_DO_NOTEBOOK:3022/api/saude`.
6. Reinicie o Expo com `npx expo start -c`.

No emulador Android, use `http://10.0.2.2:3022`. Não use `localhost` no celular físico.

## Conta administrativa

- E-mail padrão: `admin@techcampus.com`
- Senha: gerada automaticamente na primeira inicialização e exibida no terminal.

Para definir uma nova senha, altere `ADMIN_PASSWORD` no arquivo local `.env` (mínimo de 12 caracteres) e execute:

```bash
node seed-admin.js
```

## Configuração local

O arquivo `.env.example` contém as variáveis de referência. O arquivo `.env` contém segredos e senhas locais: não o publique nem o compartilhe.

- `PORT`: porta HTTP (padrão 3022)
- `DB_PATH`: caminho do banco SQLite
- `JWT_SECRET`: segredo de sessão, gerado automaticamente pelo preparador
- `PAGAMENTO_SIMULADO=true`: habilita simulação de pagamento PIX
- `ADMIN_EMAIL` e `ADMIN_PASSWORD`: credenciais administrativas locais
- `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`: configuração opcional de recuperação de senha por e-mail

## Pagamentos e IoT

Esta é uma versão demonstrativa. Não utilize para processar pagamentos reais. A liberação do token de retirada depende da confirmação do pagamento registrada no sistema. A integração física com o dispositivo IoT deve ser validada no ambiente de apresentação.

## Segurança

- O Git ignora o arquivo `.env`, bancos SQLite, pastas de uploads e dependências instaladas.
- Não adicione senhas, chaves de API ou dados pessoais reais ao repositório.
