Claro, aqui está o conteúdo pronto para você copiar e colar direto no seu README.md:

# 🌱 Planeta Projeto

Projeto web para apoiar alunos a criarem e compartilharem projetos sustentáveis que ajudam o meio ambiente. Possui cadastro/login, postagem de projetos com imagens e vídeos, comentários, e controle de permissões para edição e exclusão.

---

## 📋 Funcionalidades

- Cadastro e login via Firebase Authentication (email e senha)
- Postagem de projetos sustentáveis com:
  - Título e descrição
  - Imagem obrigatória (upload com barra de progresso)
  - Vídeo opcional (upload com barra de progresso)
- Visualização de projetos em grid responsivo, ordenados por data
- Comentários em tempo real para cada projeto
- Botões **Editar** e **Excluir** disponíveis somente para:
  - Dono do projeto
  - Administrador do site (UID definido nas regras)
- Controle de limite diário de upload: máximo 5 GB por dia no total para todos os usuários
- Interface moderna, responsiva e acessível
- Segurança reforçada nas regras do Firebase Storage e Firestore para garantir que somente donos e admin possam editar/excluir

---

## 🛠 Tecnologias usadas

- HTML5, CSS3 e JavaScript (ES Modules)
- Firebase Authentication, Firestore, Storage
- Firebase SDK versão 11.9.1 via CDN
- Deploy via GitHub Pages ou outro host estático

---

## 🚀 Como usar localmente

1. Clone este repositório:

   ```bash
   git clone https://github.com/seuusuario/planeta-projeto.git

	2.	Abra o arquivo index.html no navegador (Chrome, Firefox, Edge etc.)
	3.	Crie uma conta ou faça login para postar projetos
	4.	Faça upload de imagens e vídeos (até 5 GB por arquivo, com limite total diário de 5 GB)
	5.	Visualize e interaja com projetos e comentários da comunidade

⸻

☁️ Configuração Firebase

Para usar seu próprio Firebase:
	1.	Crie um projeto no Firebase Console
	2.	Ative Authentication com método Email/Senha
	3.	Ative Firestore e configure as regras para leitura/escrita conforme seu projeto
	4.	Ative Storage para armazenar imagens e vídeos, e configure as regras de segurança para restringir upload, edição e exclusão ao dono do arquivo e ao administrador
	5.	Substitua o bloco firebaseConfig no arquivo index.html pelas suas credenciais Firebase

⸻

⚙️ Regras importantes do Firebase Storage e Firestore
	•	Apenas usuários autenticados podem criar projetos e fazer upload de arquivos
	•	Somente o dono do projeto e o administrador (UID definido no código e nas regras) podem editar ou apagar o projeto e arquivos relacionados
	•	Limite diário de upload de arquivos fixado em 5 GB, para controlar uso de banda e espaço
	•	Regras detalhadas podem ser encontradas no arquivo firebase.rules ou no console Firebase

⸻

📁 Estrutura dos arquivos
	•	index.html – estrutura e conteúdo do site
	•	style.css – estilos para layout e responsividade
	•	script.js – lógica front-end e integração com Firebase

⸻

⚠️ Limitações e cuidados
	•	Limite de upload de 5 GB por arquivo e 5 GB por dia para todo o sistema
	•	Testado em navegadores modernos que suportam ES Modules
	•	Requer conexão estável para uploads grandes
	•	Configurar regras de segurança do Firebase para evitar acessos indevidos

⸻

💡 Melhorias futuras
	•	Filtros por categoria e busca nos projetos
	•	Perfil do usuário com histórico de projetos
	•	Sistema de curtidas e notificações
	•	Otimizações de desempenho e experiência do usuário (UX)
	•	Painel administrativo para gerenciamento de usuários e projetos

⸻

📞 Contato

Alisson Kauan Reinaldo Alves
Email: [alissonkauan677@gmail.com]
GitHub:https://alissonkauanzx.github.io/Projeto-planeta-03/

⸻

© 2025 Planeta Projeto. Todos os direitos reservados.
