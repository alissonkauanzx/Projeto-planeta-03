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
const MAX_DAILY_BYTES = 5 * 1024 * 1024 * 1024; // 5GB limite diário
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

// Container para o modal de projeto expandido
const expandedProjectModal = document.createElement("div");
expandedProjectModal.id = "expanded-project-modal";
document.body.appendChild(expandedProjectModal);

// ==================== CONFIGURAÇÃO CLOUDINARY ====================
const configMeta = document.querySelector('meta[name="cloudinary-config"]');
const cloudName = configMeta.dataset.cloudName;
const uploadPreset = configMeta.dataset.uploadPreset;

// ==================== FUNÇÕES AUXILIARES ====================
const showElement = el => { if (el) el.style.display = "block"; };
const hideElement = el => { if (el) el.style.display = "none"; };

function resetProjectForm() {
  document.getElementById("project-title").value = "";
  document.getElementById("project-desc").value = "";
  document.getElementById("project-image").value = "";
  document.getElementById("project-video").value = "";
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
window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) return alert("Preencha e-mail e senha.");
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert("Erro no login: " + error.message);
  }
};

window.register = async () => {
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  if (!email || !password) return alert("Preencha e-mail e senha.");
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Conta criada com sucesso!");
    showLogin();
  } catch (error) {
    alert("Erro no registro: " + error.message);
  }
};

window.logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert("Erro ao sair: " + error.message);
  }
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    hideElement(loginSection);
    hideElement(registerSection);
    hideElement(projectForm);
    showElement(postProjectBtn);
    showElement(logoutBtn);
    loadProjects();
  } else {
    showLogin();
    hideElement(postProjectBtn);
    hideElement(logoutBtn);
    projectsContainer.innerHTML = "";
  }
});

// ==================== LIMITE DIÁRIO DE UPLOAD ====================
async function canUpload(newBytes) {
  const today = new Date().toISOString().split('T')[0];
  const dailyRef = doc(db, "dailyUsage", today);
  try {
    const snap = await getDoc(dailyRef);
    const usedBytes = snap.exists() ? snap.data().totalBytes : 0;
    if (usedBytes + newBytes > MAX_DAILY_BYTES) {
      alert("⚠️ Limite diário de 5 GB atingido.");
      return false;
    }
    if (snap.exists()) {
      await updateDoc(dailyRef, { totalBytes: increment(newBytes) });
    } else {
      await setDoc(dailyRef, { totalBytes: newBytes });
    }
    return true;
  } catch (error) {
    alert("Erro ao verificar limite de upload.");
    return false;
  }
}

// ==================== UPLOAD PARA CLOUDINARY ====================
async function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE_BYTES) return reject(new Error(`"${file.name}" excede 5 GB.`));
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    xhr.open("POST", url, true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        showElement(uploadProgress);
        uploadProgress.value = percent;
        showElement(uploadMessage);
        uploadMessage.textContent = `Enviando "${file.name}" - ${percent.toFixed(0)}%`;
      }
    };
    xhr.onload = () => {
      hideElement(uploadProgress);
      hideElement(uploadMessage);
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText).secure_url);
      } else {
        reject(new Error(`Erro no upload: ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => {
      hideElement(uploadProgress);
      hideElement(uploadMessage);
      reject(new Error("Erro na requisição de upload."));
    };
    xhr.send(formData);
  });
}

// ==================== ENVIO DE PROJETO ====================
window.submitProject = async () => {
  const title = document.getElementById("project-title").value.trim();
  const description = document.getElementById("project-desc").value.trim();
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
    const uploadPromises = [];
    if (imageFile) uploadPromises.push(uploadToCloudinary(imageFile));
    else uploadPromises.push(Promise.resolve(null));
    if (pdfFile) uploadPromises.push(uploadToCloudinary(pdfFile));
    else uploadPromises.push(Promise.resolve(null));
    if (videoFile) uploadPromises.push(uploadToCloudinary(videoFile));
    else uploadPromises.push(Promise.resolve(null));

    const [imageUrl, pdfUrl, videoUrl] = await Promise.all(uploadPromises);

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
function loadProjects() {
  const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    projectsContainer.innerHTML = "";
    if (snapshot.empty) {
      projectsContainer.innerHTML = "<p>Nenhum projeto postado.</p>";
      return;
    }
    snapshot.docs.forEach((docSnap) => {
      const project = { id: docSnap.id, ...docSnap.data() };
      projectsContainer.appendChild(createProjectCard(project));
    });
  });
}

// ==================== CRIAR CARD DE PROJETO ====================
function createProjectCard(project) {
  const card = document.createElement("div");
  card.classList.add("project-card");
  card.style.cursor = "pointer"; // Indica clicável

  card.innerHTML = `
    <h3>${project.title}</h3>
    <p>${project.description}</p>
    ${project.imageUrl ? `<img src="${project.imageUrl}" alt="${project.title}">` : ""}
    ${project.pdfUrl ? `<iframe src="${project.pdfUrl}" width="100%" height="300" frameborder="0"></iframe>` : ""}
    ${project.videoUrl ? `<video src="${project.videoUrl}" controls></video>` : ""}
    <div class="actions"></div>
    <div class="comments-section">
      <h4>Comentários</h4>
      <div class="comments-list"></div>
      <div class="new-comment">
        <input type="text" placeholder="Escreva um comentário..." />
        <button class="btn-comment">Enviar</button>
      </div>
    </div>
  `;

  // Botões editar/apagar só para dono ou admin
  const actions = card.querySelector(".actions");
  if (auth.currentUser && (auth.currentUser.uid === project.userId || auth.currentUser.uid === ADMIN_UID)) {
    const editButton = document.createElement("button");
    editButton.textContent = "Editar";
    editButton.onclick = (e) => {
      e.stopPropagation();
      editProject(project);
    };
    actions.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Apagar";
    deleteButton.onclick = async (e) => {
      e.stopPropagation();
      await deleteProject(project.id);
    };
    actions.appendChild(deleteButton);
  }

  // Exibir comentários
  const list = card.querySelector(".comments-list");
  (project.comments || []).forEach(comment => addCommentToList(list, comment));

  // Enviar comentário
  const commentBtn = card.querySelector(".btn-comment");
  const inputComment = card.querySelector(".new-comment input");
  commentBtn.onclick = async (e) => {
    e.stopPropagation();
    const text = inputComment.value.trim();
    if (!text) return;
    if (!auth.currentUser) return alert("Você precisa estar logado para comentar.");

    const commentData = {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      text,
      createdAt: new Date()
    };
    try {
      await updateDoc(doc(db, "projects", project.id), {
        comments: arrayUnion(commentData)
      });
      addCommentToList(list, commentData);
      inputComment.value = "";
    } catch (error) {
      alert("Erro ao enviar comentário.");
    }
  };

  // Clique no card expande para modal tela cheia
  card.onclick = () => openProjectModal(project);

  // Animação suave na entrada do card
  card.style.opacity = 0;
  card.style.transform = "translateY(20px)";
  setTimeout(() => {
    card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    card.style.opacity = 1;
    card.style.transform = "translateY(0)";
  }, 50);

  return card;
}

// ==================== MODAL DE PROJETO EXPANDIDO ====================
function openProjectModal(project) {
  expandedProjectModal.innerHTML = `
    <div class="modal-content">
      <button id="close-modal-btn" aria-label="Fechar modal">&times;</button>
      <h2>${project.title}</h2>
      <p>${project.description}</p>
      ${project.imageUrl ? `<img src="${project.imageUrl}" alt="${project.title}" class="modal-image">` : ""}
      ${project.pdfUrl ? `<iframe src="${project.pdfUrl}" width="100%" height="600" frameborder="0"></iframe>` : ""}
      ${project.videoUrl ? `<video src="${project.videoUrl}" controls autoplay class="modal-video"></video>` : ""}
      <div class="modal-comments-section">
        <h3>Comentários</h3>
        <div class="modal-comments-list"></div>
        <div class="modal-new-comment">
          <input type="text" placeholder="Escreva um comentário..." />
          <button id="modal-send-comment-btn">Enviar</button>
        </div>
      </div>
    </div>
  `;

  expandedProjectModal.style.display = "flex";
  setTimeout(() => {
    expandedProjectModal.style.opacity = "1"; // transição fade-in
  }, 50);

  // Carregar comentários
  const commentsList = expandedProjectModal.querySelector(".modal-comments-list");
  commentsList.innerHTML = "";
  (project.comments || []).forEach(comment => addCommentToList(commentsList, comment));

  // Botão fechar modal
  const closeBtn = document.getElementById("close-modal-btn");
  closeBtn.onclick = closeProjectModal;

  // Enviar comentário no modal
  const input = expandedProjectModal.querySelector(".modal-new-comment input");
  const sendBtn = document.getElementById("modal-send-comment-btn");
  sendBtn.onclick = async () => {
    const text = input.value.trim();
    if (!text) return;
    if (!auth.currentUser) return alert("Você precisa estar logado para comentar.");

    const commentData = {
      userId:
