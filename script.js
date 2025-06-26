// ==================== IMPORTS ====================
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  setDoc,
  increment,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ==================== CONFIGURAÇÃO ====================
const auth = window.firebaseAuth;
const db = getFirestore();

const ADMIN_UID = "khhRon4qIBZdyaJfVKN6ZiSApgR2";
const MAX_DAILY_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_FILE_SIZE_BYTES = MAX_DAILY_BYTES;

// ==================== SELETORES ====================
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const projectForm = document.getElementById("project-form");
const postProjectBtn = document.getElementById("post-project-btn");
const logoutBtn = document.getElementById("logout-btn");
const projectsContainer = document.getElementById("projects");
const uploadProgress = document.getElementById("upload-progress");
const uploadMessage = document.getElementById("upload-message");

// ==================== CONFIGURAÇÃO CLOUDINARY ====================
const configMeta = document.querySelector('meta[name="cloudinary-config"]');
const cloudName = configMeta.dataset.cloudName;
const uploadPreset = configMeta.dataset.uploadPreset;

// ==================== FUNÇÕES AUXILIARES ====================
const showElement = el => { if (el) el.style.display = "block"; };
const hideElement = el => { if (el) el.style.display = "none"; };

function resetProjectForm() {
  const titleInput = document.getElementById("project-title");
  const descInput = document.getElementById("project-desc");
  const imageInput = document.getElementById("project-image");
  const videoInput = document.getElementById("project-video");

  if (titleInput) titleInput.value = "";
  if (descInput) descInput.value = "";
  if (imageInput) imageInput.value = "";
  if (videoInput) videoInput.value = "";
  hideElement(uploadProgress);
  hideElement(uploadMessage);
  delete window.currentProjectId;
}

// ==================== NAVEGAÇÃO ====================
window.showLogin = () => {
  showElement(loginSection);
  hideElement(registerSection);
  hideElement(projectForm);
};

window.showRegister = () => {
  hideElement(loginSection);
  showElement(registerSection);
  hideElement(projectForm);
};

window.showProjectForm = () => {
  hideElement(loginSection);
  hideElement(registerSection);
  showElement(projectForm);
};

// ==================== AUTENTICAÇÃO ====================
// (mesmo conteúdo que antes)

// ==================== LIMITE DIÁRIO DE UPLOAD ====================
// (mesmo conteúdo que antes)

// ==================== UPLOAD PARA CLOUDINARY ====================
// (mesmo conteúdo que antes)

// ==================== ENVIO DE PROJETO ====================
window.submitProject = async () => {
  const title = document.getElementById("project-title")?.value.trim();
  const description = document.getElementById("project-desc")?.value.trim();
  const imageFileInput = document.getElementById("project-image");
  const videoFileInput = document.getElementById("project-video");

  const uid = auth.currentUser?.uid;
  if (!title || !description) return alert("Preencha todos os campos obrigatórios.");
  if (!uid) return alert("Usuário não autenticado.");

  let imageFile, pdfFile;
  for (const file of imageFileInput.files) {
    if (file.type === "application/pdf") pdfFile = file;
    else if (file.type.startsWith("image/")) imageFile = file;
  }
  const videoFile = videoFileInput?.files[0];

  const totalBytes = (imageFile?.size || 0) + (pdfFile?.size || 0) + (videoFile?.size || 0);
  if (!(await canUpload(totalBytes))) return;

  try {
    let imageUrl, pdfUrl, videoUrl;
    if (imageFile) imageUrl = await uploadToCloudinary(imageFile);
    if (pdfFile) pdfUrl = await uploadToCloudinary(pdfFile);
    if (videoFile) videoUrl = await uploadToCloudinary(videoFile);

    const projectData = {
      title,
      description,
      createdAt: new Date(),
      userId: uid,
      comments: []
    };
    if (imageUrl) projectData.imageUrl = imageUrl;
    if (pdfUrl) projectData.pdfUrl = pdfUrl;
    if (videoUrl) projectData.videoUrl = videoUrl;

    if (window.currentProjectId) {
      await updateDoc(doc(db, "projects", window.currentProjectId), projectData);
      delete window.currentProjectId;
      alert("Projeto atualizado com sucesso!");
    } else {
      await addDoc(collection(db, "projects"), projectData);
      alert("Projeto enviado com sucesso!");
    }
    hideElement(projectForm);
    loadProjects();
    resetProjectForm();
  } catch (error) {
    alert(`Erro ao salvar projeto: ${error.message}`);
  }
};

// ==================== CARREGAR PROJETOS ====================
// (mesmo conteúdo que antes)

// ==================== CRIAR CARD DE PROJETO ====================
// (mesmo conteúdo que antes)

// ==================== EDITAR/DELETAR PROJETO, COMENTÁRIOS, INICIALIZAÇÃO ====================
// (mesmo conteúdo que antes)
