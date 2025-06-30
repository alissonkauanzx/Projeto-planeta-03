// script.js - Planeta Projeto 🌱
// Usando Firebase Auth, Firestore e Cloudinary para upload e dados

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Firebase config (SEUS DADOS - atualize se precisar)
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_AUTH_DOMAIN.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Cloudinary config (SEUS DADOS)
const cloudName = "dz0kjpcoa";
const uploadPreset = "projeto_planeta";

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const loginSection = document.getElementById("login-section");
  const registerSection = document.getElementById("register-section");
  const projectFormSection = document.getElementById("project-form");
  const projectsGrid = document.getElementById("projects");

  const postProjectBtn = document.getElementById("post-project-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const toRegisterLink = document.getElementById("to-register");
  const toLoginLink = document.getElementById("to-login");

  const submitProjectBtn = document.getElementById("submit-project-btn");
  const cancelProjectBtn = document.getElementById("cancel-project-btn");

  const projectTitleInput = document.getElementById("project-title");
  const projectDescInput = document.getElementById("project-desc");
  const projectImageInput = document.getElementById("project-image");
  const projectVideoInput = document.getElementById("project-video");

  const uploadProgress = document.getElementById("upload-progress");
  const uploadMessage = document.getElementById("upload-message");

  const fullscreenOverlay = document.getElementById("fullscreen-project");
  const fullscreenData = document.getElementById("fullscreen-data");
  const closeFullscreenBtn = document.getElementById("close-fullscreen");

  // Controle de exibição das seções
  function showSection(section) {
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    projectFormSection.style.display = "none";
    if (section) section.style.display = "block";
  }

  // Limpa formulário do projeto
  function clearProjectForm() {
    projectTitleInput.value = "";
    projectDescInput.value = "";
    projectImageInput.value = "";
    projectVideoInput.value = "";
  }

  // Troca de telas login <-> registro
  toRegisterLink.addEventListener("click", (e) => {
    e.preventDefault();
    showSection(registerSection);
  });

  toLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    showSection(loginSection);
  });

  // Login Firebase
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      alert("Preencha email e senha para entrar.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Após login, show projetos e postar projeto
    } catch (error) {
      alert("Erro no login: " + error.message);
    }
  });

  // Registro Firebase
  registerBtn.addEventListener("click", async () => {
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();

    if (!email || !password) {
      alert("Preencha email e senha para registrar.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Após registro, mostrar projetos e postar projeto
    } catch (error) {
      alert("Erro no cadastro: " + error.message);
    }
  });

  // Logout
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });

  // Mostrar lista de projetos no grid
  async function loadProjects() {
    projectsGrid.innerHTML = "";
    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      projectsGrid.innerHTML = `<p style="text-align:center; color:#2e7d32; font-weight:700;">Nenhum projeto postado ainda.</p>`;
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const project = docSnap.data();
      const id = docSnap.id;

      // Criar card do projeto
      const card = document.createElement("div");
      card.classList.add("project-card");
      card.tabIndex = 0; // para foco teclado
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Ver detalhes do projeto: ${project.title}`);

      // Conteúdo básico
      card.innerHTML = `
        <h3>${project.title}</h3>
        <p>${project.description.length > 120 ? project.description.slice(0, 120) + "..." : project.description}</p>
      `;

      // Mostrar a primeira mídia disponível no card (imagem, vídeo, ou PDF como iframe)
      let mediaHTML = "";
      if (project.images && project.images.length > 0) {
        mediaHTML = `<img src="${project.images[0]}" alt="Imagem do projeto ${project.title}" loading="lazy" />`;
      } else if (project.videos && project.videos.length > 0) {
        mediaHTML = `<video src="${project.videos[0]}" controls muted preload="metadata"></video>`;
      } else if (project.pdfs && project.pdfs.length > 0) {
        mediaHTML = `<iframe src="${project.pdfs[0]}" class="pdf-view" title="PDF do projeto ${project.title}" loading="lazy"></iframe>`;
      }

      card.insertAdjacentHTML("beforeend", mediaHTML);

      // Clique no card abre modal fullscreen
      card.addEventListener("click", () => {
        openFullscreenProject(id);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openFullscreenProject(id);
        }
      });

      projectsGrid.appendChild(card);
    });
  }

  // Abrir modal fullscreen com projeto detalhado
  async function openFullscreenProject(projectId) {
    fullscreenData.innerHTML = "<p>Carregando...</p>";
    fullscreenOverlay.classList.add("active");

    try {
      const docRef = doc(db, "projects", projectId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        fullscreenData.innerHTML = "<p>Projeto não encontrado.</p>";
        return;
      }
      const project = docSnap.data();

      // Conteúdo detalhado com todas as mídias e comentários
      let html = `
        <h2>${project.title}</h2>
        <p>${project.description}</p>
        <div class="media-container">
      `;

      // Imagens
      if (project.images && project.images.length > 0) {
        project.images.forEach((url) => {
          html += `<img src="${url}" alt="Imagem do projeto" class="modal-image" loading="lazy" />`;
        });
      }

      // Vídeos
      if (project.videos && project.videos.length > 0) {
        project.videos.forEach((url) => {
          html += `<video src="${url}" controls class="modal-video" preload="metadata"></video>`;
        });
      }

      // PDFs
      if (project.pdfs && project.pdfs.length > 0) {
        project.pdfs.forEach((url) => {
          html += `<iframe src="${url}" class="pdf-view" title="PDF do projeto" loading="lazy"></iframe>`;
        });
      }

      html += `</div>`;

      // Comentários da modal
      html += `
        <section class="comments-section">
          <h3>Comentários</h3>
          <div id="modal-comments-list" class="modal-comments-list">Carregando comentários...</div>
          <input type="text" id="modal-comment-input" placeholder="Escreva um comentário..." />
          <button id="modal-comment-btn">Enviar Comentário</button>
        </section>
      `;

      fullscreenData.innerHTML = html;

      // Carregar comentários
      loadComments(projectId);

      // Evento para enviar comentário
      const commentInput = document.getElementById("modal-comment-input");
      const commentBtn = document.getElementById("modal-comment-btn");

      commentBtn.addEventListener("click", async () => {
        const text = commentInput.value.trim();
        if (!text) return alert("Digite um comentário antes de enviar.");

        const user = auth.currentUser;
        if (!user) {
          alert("Você precisa estar logado para comentar.");
          return;
        }

        const commentData = {
          userId: user.uid,
          userEmail: user.email,
          text,
          createdAt: serverTimestamp(),
        };

        const projectRef = doc(db, "projects", projectId);
        await updateDoc(projectRef, {
          comments: arrayUnion(commentData),
        });

        commentInput.value = "";
        loadComments(projectId);
      });
    } catch (error) {
      fullscreenData.innerHTML = `<p>Erro ao carregar projeto: ${error.message}</p>`;
    }
  }

  // Fechar modal fullscreen
  closeFullscreenBtn.addEventListener("click", () => {
    fullscreenOverlay.classList.remove("active");
  });

  // Carregar comentários para modal
  async function loadComments(projectId) {
    const commentsList = document.getElementById("modal-comments-list");
    commentsList.innerHTML = "Carregando comentários...";

    try {
      const docRef = doc(db, "projects", projectId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        commentsList.innerHTML = "<p>Projeto não encontrado.</p>";
        return;
      }

      const project = docSnap.data();
      const comments = project.comments || [];

      if (comments.length === 0) {
        commentsList.innerHTML = "<p>Nenhum comentário ainda.</p>";
        return;
      }

      // Ordenar comentários por data (mais recentes embaixo)
      comments.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.seconds - b.createdAt.seconds;
      });

      commentsList.innerHTML = "";

      comments.forEach((c) => {
        const p = document.createElement("p");
        p.textContent = `${c.userEmail}: ${c.text}`;
        commentsList.appendChild(p);
      });
    } catch (error) {
      commentsList.innerHTML = `<p>Erro ao carregar comentários: ${error.message}</p>`;
    }
  }

  // Função para upload de arquivo para Cloudinary, retorna URL
  async function uploadFileToCloudinary(file) {
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Erro no upload request");
    }

    const data = await res.json();
    return data.secure_url;
  }

  // Enviar projeto com múltiplos arquivos
  submitProjectBtn.addEventListener("click", async () => {
    const title = projectTitleInput.value.trim();
    const description = projectDescInput.value.trim();

    if (!title || !description) {
      alert("Por favor, preencha título e descrição do projeto.");
      return;
    }

    // Desabilitar botão e mostrar progresso
    submitProjectBtn.disabled = true;
    uploadProgress.style.display = "block";
    uploadProgress.value = 0;
    uploadMessage.style.display = "block";
    uploadMessage.textContent = "Enviando arquivos...";

    try {
      // Upload múltiplo de imagens e PDFs
      const imageFiles = Array.from(projectImageInput.files).filter(f =>
        f.type.startsWith("image/") || f.type === "application/pdf"
      );

      let imageUrls = [];
      let pdfUrls = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const url = await uploadFileToCloudinary(file);
        if (file.type === "application/pdf") {
          pdfUrls.push(url);
        } else {
          imageUrls.push(url);
        }
        uploadProgress.value = Math.round(((i + 1) / (imageFiles.length + (projectVideoInput.files.length > 0 ? 1 : 0))) * 100);
      }

      // Upload de vídeo (se houver)
      let videoUrls = [];
      if (projectVideoInput.files.length > 0) {
        const videoFile = projectVideoInput.files[0];
        const url = await uploadFileToCloudinary(videoFile);
        videoUrls.push(url);
        uploadProgress.value = 100;
      }

      // Criar doc projeto no Firestore
      await addDoc(collection(db, "projects"), {
        title,
        description,
        images: imageUrls,
        videos: videoUrls,
        pdfs: pdfUrls,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        createdAt: serverTimestamp(),
        comments: [],
      });

      alert("Projeto enviado com sucesso!");
      clearProjectForm();
      showSection(null); // oculta formulário

      // Atualizar lista de projetos
      loadProjects();
    } catch (error) {
      alert("Erro ao enviar projeto: " + error.message);
    } finally {
      submitProjectBtn.disabled = false;
      uploadProgress.style.display = "none";
      uploadMessage.style.display = "none";
    }
  });

  // Cancelar postagem - limpa formulário e oculta
  cancelProjectBtn.addEventListener("click", () => {
    clearProjectForm();
    showSection(null);
  });

  // Botão postar projeto mostra formulário
  postProjectBtn.addEventListener("click", () => {
    showSection(projectFormSection);
  });

  // Atualiza interface conforme estado de login
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // Usuário logado
      loginSection.style.display = "none";
      registerSection.style.display = "none";
      postProjectBtn.style.display = "inline-block";
      logoutBtn.style.display = "inline-block";
      projectFormSection.style.display = "none";

      loadProjects();
    } else {
      // Usuário deslogado
      showSection(loginSection);
      postProjectBtn.style.display = "none";
      logoutBtn.style.display = "none";
      projectsGrid.innerHTML = "";
    }
  });

  // Inicializa mostrando login
  showSection(loginSection);
});
