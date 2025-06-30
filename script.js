import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase config - substitua pelos seus dados
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_AUTHDOMAIN.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET.appspot.com",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Elementos DOM principais ---
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const projectFormSection = document.getElementById("project-form");
const projectsGrid = document.getElementById("projects");
const fullscreenOverlay = document.getElementById("fullscreen-project");
const fullscreenData = document.getElementById("fullscreen-data");

const postProjectBtn = document.getElementById("post-project-btn");
const logoutBtn = document.getElementById("logout-btn");

const loginEmailInput = document.getElementById("email");
const loginPasswordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const toRegisterLink = document.getElementById("to-register");

const registerEmailInput = document.getElementById("reg-email");
const registerPasswordInput = document.getElementById("reg-password");
const registerBtn = document.getElementById("register-btn");
const toLoginLink = document.getElementById("to-login");

const projectTitleInput = document.getElementById("project-title");
const projectDescInput = document.getElementById("project-desc");
const projectImageInput = document.getElementById("project-image");
const projectVideoInput = document.getElementById("project-video");
const uploadProgress = document.getElementById("upload-progress");
const uploadMessage = document.getElementById("upload-message");
const submitProjectBtn = document.getElementById("submit-project-btn");

// Botão novo para cancelar post
let cancelPostBtn = null;

// Cloudinary config
const cloudName = "dz0kjpcoa";
const uploadPreset = "projeto_planeta";

// Estado do usuário atual
let currentUser = null;

// ------------------------ Funções auxiliares ------------------------ //

// Mostrar e esconder seções
function showSection(section) {
  [loginSection, registerSection, projectFormSection].forEach(sec => {
    sec.style.display = "none";
  });
  if (section) section.style.display = "block";
}

// Criar elemento DOM com classes e texto
function createElement(type, classNames = [], textContent = "") {
  const el = document.createElement(type);
  if (Array.isArray(classNames)) el.classList.add(...classNames);
  else if (typeof classNames === "string") el.classList.add(classNames);
  if (textContent) el.textContent = textContent;
  return el;
}

// Upload de arquivo para Cloudinary, retorna URL e tipo
async function uploadFileToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(url, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    throw new Error("Erro no upload: " + res.statusText);
  }

  const data = await res.json();
  // data.secure_url é a URL da mídia
  // data.resource_type é o tipo (image, video, raw)

  return {
    url: data.secure_url,
    type: data.resource_type,
    originalFilename: data.original_filename,
  };
}

// ------------------------ Login, Registro e Logout ------------------------ //

loginBtn.addEventListener("click", async () => {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value.trim();
  if (!email || !password) {
    alert("Preencha email e senha para entrar.");
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert("Erro ao entrar: " + error.message);
  }
});

toRegisterLink.addEventListener("click", e => {
  e.preventDefault();
  showSection(registerSection);
});

registerBtn.addEventListener("click", async () => {
  const email = registerEmailInput.value.trim();
  const password = registerPasswordInput.value.trim();
  if (!email || !password) {
    alert("Preencha email e senha para cadastrar.");
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert("Erro ao cadastrar: " + error.message);
  }
});

toLoginLink.addEventListener("click", e => {
  e.preventDefault();
  showSection(loginSection);
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert("Erro ao sair: " + error.message);
  }
});

// Atualiza UI conforme estado de autenticação
onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    showSection(null);
    postProjectBtn.style.display = "inline-block";
    logoutBtn.style.display = "inline-block";
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    projectFormSection.style.display = "none";
    loadProjects();
  } else {
    showSection(loginSection);
    postProjectBtn.style.display = "none";
    logoutBtn.style.display = "none";
    projectsGrid.innerHTML = "";
  }
});

// ------------------------ Postar Projeto ------------------------ //

// Abrir formulário ao clicar em "Postar Projeto"
postProjectBtn.addEventListener("click", () => {
  projectFormSection.style.display = "block";
  // Adicionar botão cancelar se ainda não tiver
  if (!cancelPostBtn) {
    cancelPostBtn = createElement("button", ["cancel-post-btn"], "Cancelar");
    cancelPostBtn.style.marginTop = "12px";
    cancelPostBtn.style.backgroundColor = "#a5d6a7";
    cancelPostBtn.style.color = "#2e3a2e";
    cancelPostBtn.style.border = "none";
    cancelPostBtn.style.padding = "12px";
    cancelPostBtn.style.borderRadius = "10px";
    cancelPostBtn.style.cursor = "pointer";
    cancelPostBtn.style.fontWeight = "700";
    cancelPostBtn.addEventListener("click", () => {
      projectFormSection.style.display = "none";
      clearProjectForm();
    });
    projectFormSection.appendChild(cancelPostBtn);
  }
});

// Limpa formulário de projeto
function clearProjectForm() {
  projectTitleInput.value = "";
  projectDescInput.value = "";
  projectImageInput.value = "";
  projectVideoInput.value = "";
  uploadProgress.style.display = "none";
  uploadProgress.value = 0;
  uploadMessage.style.display = "none";
}

// Enviar projeto para Firestore com uploads Cloudinary
submitProjectBtn.addEventListener("click", async () => {
  const title = projectTitleInput.value.trim();
  const desc = projectDescInput.value.trim();

  if (!title || !desc) {
    alert("Preencha título e descrição.");
    return;
  }

  const imagesAndPDFsFiles = projectImageInput.files;
  const videoFile = projectVideoInput.files[0];

  uploadProgress.style.display = "block";
  uploadProgress.value = 0;
  uploadMessage.style.display = "block";
  uploadMessage.textContent = "Enviando...";

  try {
    // Upload múltiplo de imagens e PDFs
    const uploadedFiles = [];
    for (let i = 0; i < imagesAndPDFsFiles.length; i++) {
      const file = imagesAndPDFsFiles[i];
      const result = await uploadFileToCloudinary(file);
      uploadedFiles.push(result);
      uploadProgress.value = Math.round(((i + 1) / (imagesAndPDFsFiles.length + (videoFile ? 1 : 0))) * 100);
    }

    // Upload do vídeo (se existir)
    let uploadedVideo = null;
    if (videoFile) {
      const videoResult = await uploadFileToCloudinary(videoFile);
      uploadedVideo = videoResult;
      uploadProgress.value = 100;
    }

    // Criar doc no Firestore
    await addDoc(collection(db, "projects"), {
      title,
      description: desc,
      userId: currentUser.uid,
      mediaFiles: uploadedFiles, // array de {url, type, originalFilename}
      videoFile: uploadedVideo,  // objeto {url, type, originalFilename} ou null
      createdAt: serverTimestamp()
    });

    alert("Projeto enviado com sucesso!");
    clearProjectForm();
    projectFormSection.style.display = "none";

  } catch (error) {
    alert("Erro ao enviar projeto: " + error.message);
  } finally {
    uploadProgress.style.display = "none";
    uploadMessage.style.display = "none";
  }
});

// ------------------------ Listar Projetos ------------------------ //

function loadProjects() {
  projectsGrid.innerHTML = "";
  const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    projectsGrid.innerHTML = "";
    snapshot.forEach(docSnap => {
      const project = { id: docSnap.id, ...docSnap.data() };
      const card = createProjectCard(project);
      projectsGrid.appendChild(card);
    });
  });
}

// Criar card de projeto
function createProjectCard(project) {
  const card = createElement("div", "project-card");
  card.setAttribute("data-id", project.id);

  const title = createElement("h3", null, project.title);
  const desc = createElement("p", null, project.description);

  card.appendChild(title);
  card.appendChild(desc);

  // Imagens e PDFs (mostrar somente imagens pequenas)
  if (project.mediaFiles && project.mediaFiles.length > 0) {
    project.mediaFiles.forEach(media => {
      if (media.type === "image") {
        const img = createElement("img");
        img.src = media.url;
        img.alt = media.originalFilename || "Imagem do projeto";
        card.appendChild(img);
      }
    });
  }

  // Vídeo (mostrar thumbnail ou player pequeno)
  if (project.videoFile && project.videoFile.url) {
    const video = createElement("video");
    video.src = project.videoFile.url;
    video.controls = true;
    video.muted = true;
    video.preload = "metadata";
    video.style.marginTop = "12px";
    card.appendChild(video);
  }

  // Clique para abrir fullscreen modal
  card.addEventListener("click", () => openProjectModal(project));

  return card;
}

// ------------------------ Modal Fullscreen ------------------------ //

function openProjectModal(project) {
  fullscreenData.innerHTML = ""; // limpa modal

  // Botão voltar discreto e posicionado no canto esquerdo
  const closeBtn = createElement("button", "close-btn", "← Voltar");
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "20px";
  closeBtn.style.left = "20px";
  closeBtn.addEventListener("click", closeProjectModal);
  fullscreenData.appendChild(closeBtn);

  // Título e descrição
  const title = createElement("h2", null, project.title);
  fullscreenData.appendChild(title);
  const desc = createElement("p", null, project.description);
  fullscreenData.appendChild(desc);

  // Container de mídia
  const mediaContainer = createElement("div", "media-container");
  fullscreenData.appendChild(mediaContainer);

  // Mostrar todas as imagens e PDFs
  if (project.mediaFiles && project.mediaFiles.length > 0) {
    project.mediaFiles.forEach(media => {
      if (media.type === "image") {
        const img = createElement("img", "modal-image");
        img.src = media.url;
        img.alt = media.originalFilename || "Imagem do projeto";
        mediaContainer.appendChild(img);
      } else if (media.type === "raw" || media.url.endsWith(".pdf")) {
        // PDF embed via iframe
        const iframe = createElement("iframe", "pdf-view");
        iframe.src = media.url;
        iframe.type = "application/pdf";
        iframe.title = media.originalFilename || "PDF do projeto";
        mediaContainer.appendChild(iframe);
      }
    });
  }

  // Mostrar vídeo (player grande)
  if (project.videoFile && project.videoFile.url) {
    const video = createElement("video", "modal-video");
    video.src = project.videoFile.url;
    video.controls = true;
    video.autoplay = false;
    video.style.maxHeight = "420px";
    mediaContainer.appendChild(video);
  }

  // Comentários
  const commentsSection = createElement("section", "comments-section");
  const commentsTitle = createElement("h3", null, "Comentários");
  commentsSection.appendChild(commentsTitle);

  const commentsList = createElement("div", "modal-comments-list");
  commentsSection.appendChild(commentsList);

  // Campo para adicionar comentário
  const commentInput = createElement("input");
  commentInput.type = "text";
  commentInput.id = "modal-comment-input";
  commentInput.placeholder = "Escreva um comentário...";
  commentsSection.appendChild(commentInput);

  const commentBtn = createElement("button");
  commentBtn.id = "modal-comment-btn";
  commentBtn.textContent = "Enviar";
  commentsSection.appendChild(commentBtn);

  fullscreenData.appendChild(commentsSection);

  // Mostrar modal
  fullscreenOverlay.classList.add("active");

  // Carregar e mostrar comentários do projeto
  const projectDocRef = doc(db, "projects", project.id);
  onSnapshot(projectDocRef, (docSnap) => {
    if (!docSnap.exists()) {
      commentsList.innerHTML = "<p>Projeto não encontrado.</p>";
      return;
    }
    const projectData = docSnap.data();
    commentsList.innerHTML = "";
    if (projectData.comments && projectData.comments.length > 0) {
      projectData.comments.forEach(c => {
        const p = createElement("p", null, `${c.userEmail}: ${c.text}`);
        commentsList.appendChild(p);
      });
    } else {
      commentsList.innerHTML = "<p>Seja o primeiro a comentar!</p>";
    }
  });

  // Enviar comentário
  commentBtn.onclick = async () => {
    const commentText = commentInput.value.trim();
    if (!commentText) return alert("Escreva algo para comentar.");
    if (!currentUser) return alert("Você precisa estar logado para comentar.");

    try {
      await updateDoc(projectDocRef, {
        comments: arrayUnion({
          text: commentText,
          userEmail: currentUser.email,
          createdAt: serverTimestamp()
        })
      });
      commentInput.value = "";
    } catch (error) {
      alert("Erro ao enviar comentário: " + error.message);
    }
  };
}

// Fecha modal fullscreen
function closeProjectModal() {
  fullscreenOverlay.classList.remove("active");
  fullscreenData.innerHTML = "";
}

// Fecha modal se clicar fora do conteúdo
fullscreenOverlay.addEventListener("click", (e) => {
  if (e.target === fullscreenOverlay) closeProjectModal();
});
