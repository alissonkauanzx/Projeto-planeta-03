<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>🌱 Planeta Projeto</title>
  <link rel="stylesheet" href="style.css" />

  <!-- Firebase -->
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
    import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

    const firebaseConfig = {
      apiKey: "AIzaSyBdWzf45GmW58N7sy7WMT9MG9G4Jy3wjsg",
      authDomain: "planeta-projeto.firebaseapp.com",
      projectId: "planeta-projeto",
      storageBucket: "planeta-projeto.appspot.com",
      messagingSenderId: "1060342659751",
      appId: "1:1060342659751:web:fbd4c421de3a02db8cb982"
    };
    const app = initializeApp(firebaseConfig);
    window.firebaseAuth = getAuth(app);
  </script>
</head>

<body>
  <!-- CABEÇALHO -->
  <header>
    <nav class="navbar" role="navigation">
      <h1>🌱 Planeta Projeto</h1>
      <div class="right-buttons">
        <button id="post-project-btn" onclick="showProjectForm()" style="display:none;">Postar meu projeto</button>
        <button id="logout-btn" onclick="logout()" style="display:none;">Sair</button>
      </div>
    </nav>
  </header>

  <!-- CONTEÚDO CENTRAL -->
  <main class="center-wrapper">
    <!-- FORMULÁRIO DE LOGIN -->
    <section id="login-section" class="auth-section" role="region" aria-label="Login">
      <h2>Entre para continuar</h2>
      <label for="email">E-mail</label>
      <input type="email" id="email" placeholder="Digite seu e-mail" required />

      <label for="password">Senha</label>
      <input type="password" id="password" placeholder="Digite sua senha" required />

      <button onclick="login()">Entrar</button>
      <p>Não tem conta? 
        <button type="button" class="link-btn" onclick="showRegister()">Registrar</button>
      </p>
    </section>

    <!-- FORMULÁRIO DE REGISTRO -->
    <section id="register-section" class="auth-section" style="display:none;" role="region" aria-label="Registro">
      <h2>Crie sua conta</h2>
      <label for="reg-email">E-mail</label>
      <input type="email" id="reg-email" placeholder="Seu e-mail" required />

      <label for="reg-password">Senha</label>
      <input type="password" id="reg-password" placeholder="Crie uma senha" required />

      <button onclick="register()">Registrar</button>
      <p>Já tem conta? 
        <button type="button" class="link-btn" onclick="showLogin()">Entrar</button>
      </p>
    </section>

    <!-- FORMULÁRIO DE PROJETO -->
    <section id="project-form" class="project-form-section" style="display:none;" role="region" aria-label="Postar Projeto">
      <h2>Enviar Projeto Sustentável</h2>

      <label for="project-title">Título do Projeto</label>
      <input type="text" id="project-title" placeholder="Título do Projeto" required />

      <label for="project-desc">Descrição</label>
      <textarea id="project-desc" placeholder="Descreva o projeto..." rows="5"></textarea>

      <label for="project-image">Imagem (máx 5 GB)</label>
      <input type="file" id="project-image" accept="image/*" required />

      <label for="project-video">Vídeo (máx 5 GB)</label>
      <input type="file" id="project-video" accept="video/*" />

      <progress id="upload-progress" value="0" max="100" style="width: 100%; display:none;"></progress>
      <small id="upload-message" class="upload-message" style="color: #d32f2f; display:none;"></small>

      <button onclick="submitProject()">Enviar Projeto</button>
    </section>

    <!-- LISTA DE PROJETOS -->
    <section id="project-list" class="projects-section" role="region" aria-label="Projetos da Comunidade">
      <h2>Projetos da Comunidade</h2>
      <div id="projects" class="projects-grid"></div>
    </section>
  </main>

  <!-- RODAPÉ -->
  <footer>
    <p>&copy; 2025 Planeta Projeto. Todos os direitos reservados.</p>
  </footer>

  <!-- SCRIPT JS -->
  <script type="module" src="./script.js"></script>
</body>
</html>
