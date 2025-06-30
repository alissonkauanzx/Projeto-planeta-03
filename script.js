// script.js (completo, mantendo tudo que funcionava + melhorias pontuais)

// Importação e configuração Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SEU_API_KEY_AQUI",
  authDomain: "SEU_AUTH_DOMAIN_AQUI",
  projectId: "SEU_PROJECT_ID_AQUI",
  storageBucket: "SEU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID_AQUI",
  appId: "SEU_APP_ID_AQUI"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Elementos DOM principais ---
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const projectFormSection = document.getElementById("project-form");
const projectsGrid = document.getElementById("projects");
const fullscreenOverlay = document.getElementById("fullscreen-project");
const fullscreenContent = document.getElementById("fullscreen-data");

const btnLogin = document.getElementById("login-btn");
const btnRegister = document.getElementById("register-btn");
const btnLogout = document.getElementById("logout-btn");
const btnPostProject = document.getElementById("post-project-btn");
const btnCancelProject = document.getElementById("cancel-project-btn");
const btnSubmitProject = document.getElementById("submit-project-btn");
const btnCloseFullscreen = document.getElementById("close-fullscreen");

const inputEmail = document.getElementById("email");
const inputPassword = document.getElementById("password");
const inputRegEmail = document.getElementById("reg-email");
const inputRegPassword = document.getElementById("reg-password");

const inputProjectTitle = document.getElementById("project-title");
const inputProjectDesc = document.getElementById("project-desc");
const inputProjectImage = document.getElementById("project-image");
const inputProjectVideo = document.getElementById("project-video");

const uploadProgress = document.getElementById("upload-progress");
const uploadMessage = document.getElementById("upload-message");

// --- Variáveis ---
let currentUser = null;

// --- Funções de UI ---

function showSection(section) {
  // Esconde todas e mostra só a selecionada
  loginSection.style.display = "none";
  registerSection.style.display = "none";
  projectFormSection.style.display = "none";
  fullscreenOverlay.classList.remove("active");
  projectsGrid.parentElement.style.display = "block";

  section.style.display = "block";
}

function resetProjectForm() {
  inputProjectTitle.value = "";
  inputProjectDesc.value = "";
  inputProjectImage.value = "";
  inputProjectVideo.value = "";
  uploadProgress.style.display = "none";
  uploadProgress.value = 0;
  uploadMessage.style.display = "none";
}

function createProjectCard(project) {
  const card = document.createElement("div");
  card.classList.add("project-card");
  card.dataset.id = project.id;

  // Título e descrição
  const title = document.createElement("h3");
  title.textContent = project.title;
  card.appendChild(title);

  const desc = document.createElement("p");
  desc.textContent = project.description.length > 150
    ? project.description.slice(0, 147) + "..."
    : project.description;
  card.appendChild(desc);

  // Imagem ou vídeo preview (se houver)
  if (project.images && project.images.length > 0) {
    // Mostrar primeira imagem
    const img = document.createElement("img");
    img.src = project.images[0];
    img.alt = project.title;
    card.appendChild(img);
  } else if (project.video) {
    const video = document.createElement("video");
    video.src = project.video;
    video.controls = false;
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.style.borderRadius = "14px";
    card.appendChild(video);
  }

  card.addEventListener("click", () => openProjectFullscreen(project));
  return card;
}

function openProjectFullscreen(project) {
  fullscreenContent.innerHTML = ""; // limpar

  const title = document.createElement("h2");
  title.textContent = project.title;
  fullscreenContent.appendChild(title);

  const desc = document.createElement("p");
  desc.textContent = project.description;
  desc.style.marginBottom = "20px";
  fullscreenContent.appendChild(desc);

  const mediaContainer = document.createElement("div");
  mediaContainer.classList.add("media-container");

  // Mostrar todas imagens e PDFs
  if (project.images && project.images.length > 0) {
    project.images.forEach(url => {
      if (url.endsWith(".pdf")) {
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.classList.add("pdf-view");
        mediaContainer.appendChild(iframe);
      } else {
        const img = document.createElement("img");
        img.src = url;
        img.alt = project.title;
        img.classList.add("modal-image");
        mediaContainer.appendChild(img);
      }
    });
  }

  // Vídeo
  if (project.video) {
    const video = document.createElement("video");
    video.src = project.video;
    video.controls = true;
    video.autoplay = false;
    video.classList.add("modal-video");
    mediaContainer.appendChild(video);
  }

  fullscreenContent.appendChild(mediaContainer);

  // Comentários
  const commentsSection = document.createElement("section");
  commentsSection.classList.add("comments-section");

  const commentsTitle = document.createElement("h3");
  commentsTitle.textContent = "Comentários";
  commentsTitle.style.color = "#2e7d32";
  commentsTitle.style.marginBottom = "12px";
  commentsSection.appendChild(commentsTitle);

  const commentsList = document.createElement("div");
  commentsList.classList.add("modal-comments-list");
  commentsSection.appendChild(commentsList);

  // Input para comentário
  const commentInput = document.createElement("textarea");
  commentInput.id = "modal-comment-input";
  commentInput.placeholder = "Escreva um comentário...";
  commentsSection.appendChild(commentInput);

  const commentBtn = document.createElement("button");
  commentBtn.id = "modal-comment-btn";
  commentBtn.textContent = "Enviar";
  commentsSection.appendChild(commentBtn);

  fullscreenContent.appendChild(commentsSection);

  // Mostrar modal fullscreen
  fullscreenOverlay.classList.add("active");
  projectsGrid.parentElement.style.display = "none";

  // Carregar comentários do projeto
  loadComments(project.id, commentsList);

  // Enviar comentário
  commentBtn.onclick = () => {
    const text = commentInput.value.trim();
    if (text && currentUser) {
      addComment(project.id, currentUser.uid, text);
      commentInput.value = "";
    }
  };
}

function closeFullscreen() {
  fullscreenOverlay.classList.remove("active");
  projectsGrid.parentElement.style.display = "block";
  fullscreenContent.innerHTML = "";
}

// --- Firebase - Login e Registro ---

btnLogin.onclick = async () => {
  const email = inputEmail.value.trim();
  const password = inputPassword.value;
  if (!email || !password) {
    alert("Por favor, preencha email e senha.");
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // sucesso - onAuthStateChanged vai cuidar do UI
  } catch (err) {
    alert("Erro ao entrar: " + err.message);
  }
};

btnRegister.onclick = async () => {
  const email = inputRegEmail.value.trim();
  const password = inputRegPassword.value;
  if (!email || !password) {
    alert("Por favor, preencha email e senha.");
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Conta criada com sucesso! Faça login.");
    showSection(loginSection);
  } catch (err) {
    alert("Erro ao cadastrar: " + err.message);
  }
};

btnLogout.onclick = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    alert("Erro ao sair: " + err.message);
  }
};

document.getElementById("to-register").onclick = (e) => {
  e.preventDefault();
  showSection(registerSection);
};
document.getElementById("to-login").onclick = (e) => {
  e.preventDefault();
  showSection(loginSection);
};

// --- Controle de estado de autenticação ---
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    // Mostrar formulário de projetos e lista de projetos
    showSection(projectFormSection);
    btnPostProject.style.display = "inline-block";
    btnLogout.style.display = "inline-block";
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    loadProjects();
  } else {
    // Mostrar tela de login
    showSection(loginSection);
    btnPostProject.style.display = "none";
    btnLogout.style.display = "none";
    projectFormSection.style.display = "none";
    projectsGrid.parentElement.style.display = "block";
    projectsGrid.innerHTML = "";
  }
});

// --- Postar projeto ---

btnPostProject.onclick = () => {
  resetProjectForm();
  showSection(projectFormSection);
};

btnCancelProject.onclick = () => {
  resetProjectForm();
  showSection(projectsGrid.parentElement);
};

btnSubmitProject.onclick = async () => {
  const title = inputProjectTitle.value.trim();
  const description = inputProjectDesc.value.trim();

  if (!title || !description) {
    alert("Preencha título e descrição do projeto.");
    return;
  }

  // Mostrar barra de progresso
  uploadProgress.style.display = "block";
  uploadMessage.style.display = "block";
  uploadProgress.value = 0;

  // Upload das imagens e PDFs
  const imagesFiles = inputProjectImage.files;
  const imagesUrls = [];

  if (imagesFiles.length > 0) {
    for (let i = 0; i < imagesFiles.length; i++) {
      const file = imagesFiles[i];
      try {
        const url = await uploadFileToCloudinary(file);
        imagesUrls.push(url);
        uploadProgress.value = Math.floor(((i + 1) / imagesFiles.length) * 80);
      } catch (err) {
        alert("Erro no upload de imagens/PDF: " + err.message);
        uploadProgress.style.display = "none";
        uploadMessage.style.display = "none";
        return;
      }
    }
  }

  // Upload do vídeo
  let videoUrl = "";
  const videoFile = inputProjectVideo.files[0];
  if (videoFile) {
    try {
      videoUrl = await uploadFileToCloudinary(videoFile);
      uploadProgress.value = 90;
    } catch (err) {
      alert("Erro no upload de vídeo: " + err.message);
      uploadProgress.style.display = "none";
      uploadMessage.style.display = "none";
      return;
    }
  }

  uploadProgress.value = 100;

  // Salvar projeto no Firestore
  try {
    await addDoc(collection(db, "projects"), {
      title,
      description,
      images: imagesUrls,
      video: videoUrl,
      userId: currentUser.uid,
      createdAt: serverTimestamp()
    });

    alert("Projeto enviado com sucesso!");
    resetProjectForm();
    showSection(projectsGrid.parentElement);
  } catch (err) {
    alert("Erro ao salvar projeto: " + err.message);
  } finally {
    uploadProgress.style.display = "none";
    uploadMessage.style.display = "none";
  }
};

// --- Função de upload para Cloudinary ---
async function uploadFileToCloudinary(file) {
  const cloudName = "dz0kjpcoa";
  const uploadPreset = "projeto_planeta";

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(url, {
    method: "POST",
    body: formData
  });

  if (!res.ok) throw new Error(`Upload falhou: ${res.statusText}`);

  const data = await res.json();
  return data.secure_url;
}

// --- Carregar projetos do Firestore ---
function loadProjects() {
  projectsGrid.innerHTML = "";
  const projectsRef = collection(db, "projects");
  const q = query(projectsRef, orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    projectsGrid.innerHTML = "";
    snapshot.forEach(docSnap => {
      const project = { id: docSnap.id, ...docSnap.data() };
      const card = createProjectCard(project);
      projectsGrid.appendChild(card);
    });
  });
}

// --- Comentários ---

async function loadComments(projectId, container) {
  container.innerHTML = "Carregando comentários...";
  const commentsRef = collection(db, "projects", projectId, "comments");
  const q = query(commentsRef, orderBy("createdAt", "asc"));

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";
    snapshot.forEach(docSnap => {
      const c = docSnap.data();
      const p = document.createElement("p");
      p.textContent = `${c.userEmail || "Anônimo"}: ${c.text}`;
      container.append
