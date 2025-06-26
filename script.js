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

// NOTE: Removi importações do Firebase Storage pois vamos usar Cloudinary
// import {
//   getStorage,
//   ref,
//   uploadBytesResumable,
//   getDownloadURL
// } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

// ==================== CONFIGURAÇÃO ====================
const auth = window.firebaseAuth;
const db = getFirestore();
// const storage = getStorage(); // Removido pois não será usado

const ADMIN_UID = "khhRon4qIBZdyaJfVKN6ZiSApgR2";
const MAX_DAILY_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
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
// Pegando os dados da meta tag no HTML
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
window.login = async () => {
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!email || !password) return alert("Preencha e-mail e senha.");

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Erro no login:", error);
    alert("Erro no login: " + error.message);
  }
};

window.register = async () => {
  const email = document.getElementById("reg-email")?.value.trim();
  const password = document.getElementById("reg-password")?.value.trim();

  if (!email || !password) return alert("Preencha e-mail e senha.");

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Conta criada com sucesso!");
    showLogin();
  } catch (error) {
    console.error("Erro no registro:", error);
    alert("Erro no registro: " + error.message);
  }
};

window.logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao sair:", error);
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
      alert("⚠️ Limite diário de 5 GB atingido. Tente novamente amanhã.");
      return false;
    }

    if (snap.exists()) {
      await updateDoc(dailyRef, { totalBytes: increment(newBytes) });
    } else {
      await setDoc(dailyRef, { totalBytes: newBytes });
    }
    return true;
  } catch (error) {
    console.error("Erro no canUpload:", error);
    alert("Erro ao verificar limite de upload. Tente novamente.");
    return false;
  }
}

// ==================== UPLOAD PARA CLOUDINARY COM PROGRESSO ====================
async function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new Error(`"${file.name}" excede 5 GB.`));
      return;
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;

    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    xhr.open("POST", url, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        showElement(uploadProgress);
        uploadProgress.value = percentComplete;
        showElement(uploadMessage);
        uploadMessage.textContent = `Enviando "${file.name}" - ${percentComplete.toFixed(0)}%`;
      }
    };

    xhr.onload = () => {
      hideElement(uploadProgress);
      hideElement(uploadMessage);

      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.secure_url);
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
  const title = document.getElementById("project-title")?.value.trim();
  const description = document.getElementById("project-desc")?.value.trim();
  const imageFile = document.getElementById("project-image")?.files[0];
  const videoFile = document.getElementById("project-video")?.files[0];
  const uid = auth.currentUser?.uid;

  if (!title || !description) return alert("Preencha todos os campos obrigatórios.");
  if (!uid) return alert("Usuário não autenticado.");

  const totalBytesToUpload = (imageFile?.size || 0) + (videoFile?.size || 0);

  if (!(await canUpload(totalBytesToUpload))) return;

  try {
    let imageUrl, videoUrl;

    if (imageFile) {
      imageUrl = await uploadToCloudinary(imageFile);
    }
    if (videoFile) {
      videoUrl = await uploadToCloudinary(videoFile);
    }

    if (window.currentProjectId) {
      const updateData = { title, description };
      if (imageUrl) updateData.imageUrl = imageUrl;
      if (videoUrl) updateData.videoUrl = videoUrl;
      await updateDoc(doc(db, "projects", window.currentProjectId), updateData);
      delete window.currentProjectId;
      alert("Projeto atualizado com sucesso!");
    } else {
      await addDoc(collection(db, "projects"), {
        title,
        description,
        imageUrl,
        videoUrl,
        createdAt: new Date(),
        userId: uid,
        comments: []
      });
      alert("Projeto enviado com sucesso!");
    }

    hideElement(projectForm);
    loadProjects();
    resetProjectForm();
  } catch (error) {
    console.error("Erro ao salvar projeto:", error);
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
  card.classList.add("project-card", "fade-in");

  card.innerHTML = `
    <h3>${project.title}</h3>
    <p>${project.description}</p>
    ${project.imageUrl ? `<img src="${project.imageUrl}" alt="${project.title}">` : ""}
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

  // Botões editar e apagar, somente para criador ou admin
  const actions = card.querySelector(".actions");
  if (auth.currentUser && (auth.currentUser.uid === project.userId || auth.currentUser.uid === ADMIN_UID)) {
    const editButton = document.createElement("button");
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => editProject(project));
    actions.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Apagar";
    deleteButton.addEventListener("click", () => deleteProject(project.id));
    actions.appendChild(deleteButton);
  }

  // Renderizar comentários
  const list = card.querySelector(".comments-list");
  (project.comments || []).forEach(comment => addCommentToList(list, comment));

  // Enviar novo comentário
  const commentBtn = card.querySelector(".btn-comment");
  const inputComment = card.querySelector(".new-comment input");

  commentBtn.addEventListener("click", async () => {
    const text = inputComment.value.trim();
    if (!text) return;

    if (!auth.currentUser) {
      alert("Você precisa estar logado para comentar.");
      return;
    }

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
      console.error("Erro ao enviar comentário:", error);
      alert("Erro ao enviar comentário. Tente novamente.");
    }
  });

  return card;
}

// ==================== EDITAR PROJETO ====================
function editProject(project) {
  showProjectForm();
  document.getElementById("project-title").value = project.title;
  document.getElementById("project-desc").value = project.description;
  window.currentProjectId = project.id;
}

// ==================== DELETAR PROJETO ====================
async function deleteProject(projectId) {
  if (!confirm("Você realmente deseja apagar este projeto?")) return;
  try {
    await deleteDoc(doc(db, "projects", projectId));
    alert("Projeto apagado com sucesso!");
  } catch (error) {
    console.error("Erro ao apagar projeto:", error);
    alert(`Erro ao apagar: ${error.message}`);
  }
}

// ==================== ADICIONAR COMENTÁRIO NA LISTA ====================
function addCommentToList(container, comment) {
  const div = document.createElement("div");
  div.classList.add("comment");

  const dateObj = comment.createdAt.seconds ? new Date(comment.createdAt.seconds * 1000) : new Date(comment.createdAt);
  const dateStr = dateObj.toLocaleString();

  div.innerHTML = `
    <p><strong>${comment.userEmail}</strong> <em>(${dateStr})</em></p>
    <p>${comment.text}</p>
  `;
  container.appendChild(div);
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener("DOMContentLoaded", showLogin);
