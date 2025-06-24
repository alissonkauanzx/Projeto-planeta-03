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
  arrayUnion
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

// ==================== CONFIGURAÇÕES ====================
const auth = window.firebaseAuth;
const db = getFirestore();
const storage = getStorage();

// ==================== SELETORES ====================
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const projectForm = document.getElementById("project-form");
const postProjectBtn = document.getElementById("post-project-btn");
const logoutBtn = document.getElementById("logout-btn");
const projectsContainer = document.getElementById("projects");
const uploadProgress = document.getElementById("upload-progress");  // barra <progress>
const uploadMessage = document.getElementById("upload-message");  // mensagem de upload

// ==================== HELPERS ====================
function showElement(el) { el.style.display = "block"; }
function hideElement(el) { el.style.display = "none"; }

function resetProjectForm() {
  document.getElementById("project-title").value = "";
  document.getElementById("project-desc").value = "";
  document.getElementById("project-image").value = "";
  document.getElementById("project-video").value = "";
  hideElement(uploadProgress);
  hideElement(uploadMessage);
}

// ==================== VISIBILIDADE DE SEÇÕES ====================
window.showLogin = () => { 
  showElement(loginSection); 
  hideElement(registerSection); 
  hideElement(projectForm); 
  hideElement(uploadProgress);
  hideElement(uploadMessage);
};
window.showRegister = () => { 
  hideElement(loginSection); 
  showElement(registerSection); 
  hideElement(projectForm); 
  hideElement(uploadProgress);
  hideElement(uploadMessage);
};
window.showProjectForm = () => { 
  hideElement(loginSection); 
  hideElement(registerSection); 
  showElement(projectForm); 
  hideElement(uploadProgress);
  hideElement(uploadMessage);
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

// ==================== CONTROLE DE AUTENTICAÇÃO ====================
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

// ==================== UPLOAD COM PROGRESSO E MENSAGEM AMIGÁVEL ====================
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

async function uploadFileWithProgress(file, path) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new Error(`O arquivo "${file.name}" excede o limite máximo de 5GB.`));
      return;
    }

    const fileRef = ref(storage, path);
    const task = uploadBytesResumable(fileRef, file);

    showElement(uploadProgress);
    uploadProgress.value = 0;

    uploadMessage.textContent = `Enviando "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`;
    showElement(uploadMessage);

    task.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        uploadProgress.value = progress;
      },
      (error) => {
        hideElement(uploadProgress);
        hideElement(uploadMessage);
        reject(error);
      },
      async () => {
        hideElement(uploadProgress);
        hideElement(uploadMessage);
        try {
          const downloadURL = await getDownloadURL(task.snapshot.ref);
          resolve(downloadURL);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

// ==================== ENVIO DE PROJETO ====================
window.submitProject = async () => {
  const title = document.getElementById("project-title").value.trim();
  const description = document.getElementById("project-desc").value.trim();
  const imageFile = document.getElementById("project-image").files[0];
  const videoFile = document.getElementById("project-video").files[0];

  if (!title || !description || !imageFile) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  try {
    // Faz upload da imagem
    const imageUrl = await uploadFileWithProgress(imageFile, `images/${Date.now()}-${imageFile.name}`);

    // Faz upload do vídeo, se houver
    let videoUrl = "";
    if (videoFile) {
      videoUrl = await uploadFileWithProgress(videoFile, `videos/${Date.now()}-${videoFile.name}`);
    }

    // Salva projeto no Firestore
    await addDoc(collection(db, "projects"), {
      title,
      description,
      imageUrl,
      videoUrl,
      createdAt: new Date(),
      userId: auth.currentUser.uid,
      comments: []
    });

    alert("Projeto enviado com sucesso!");
    hideElement(projectForm);
    loadProjects();
    resetProjectForm();

  } catch (error) {
    alert("Erro ao enviar projeto: " + error.message);
  }
};

// ==================== CARREGA PROJETOS ====================
function loadProjects() {
  const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    projectsContainer.innerHTML = "";
    if (snapshot.empty) {
      projectsContainer.innerHTML = "<p>Nenhum projeto postado ainda.</p>";
      return;
    }
    snapshot.docs.forEach((docSnap) => {
      const project = { id: docSnap.id, ...docSnap.data() };
      projectsContainer.appendChild(createProjectCard(project));
    });
  });
}

// ==================== CRIAÇÃO DE CARD DO PROJETO ====================
function createProjectCard(project) {
  const card = document.createElement("div");
  card.classList.add("project-card");

  card.innerHTML = `
    <h3>${project.title}</h3>
    <p>${project.description}</p>
    ${project.imageUrl ? `<img src="${project.imageUrl}" alt="${project.title}"/>` : ""}
    ${project.videoUrl ? `<video src="${project.videoUrl}" controls></video>` : ""}
    <div class="comments-section">
      <h4>Comentários</h4>
      <div class="comments-list"></div>
      <div class="new-comment">
        <input type="text" placeholder="Escreva um comentário..." />
        <button class="btn-comment">Enviar</button>
      </div>
    </div>
  `;

  const list = card.querySelector(".comments-list");
  (project.comments || []).forEach((c) => addCommentToList(list, c));

  const btnComment = card.querySelector(".btn-comment");
  const inputComment = card.querySelector(".new-comment input");

  btnComment.addEventListener("click", async () => {
    const text = inputComment.value.trim();
    if (!text) return;

    const commentData = {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      text,
      createdAt: new Date(),
    };

    try {
      const projectRef = doc(db, "projects", project.id);
      await updateDoc(projectRef, { comments: arrayUnion(commentData) });
      addCommentToList(list, commentData);
      inputComment.value = "";
    } catch (error) {
      alert("Erro ao enviar comentário: " + error.message);
    }
  });

  return card;
}

// ==================== ADICIONA COMENTÁRIO À LISTA ====================
function addCommentToList(container, comment) {
  const commentDiv = document.createElement("div");
  commentDiv.classList.add("comment");

  const dateStr = new Date(
    comment.createdAt.seconds ? comment.createdAt.seconds * 1000 : comment.createdAt
  ).toLocaleString();

  commentDiv.innerHTML = `
    <p><strong>${comment.userEmail}</strong> <em>(${dateStr})</em></p>
    <p>${comment.text}</p>
  `;

  container.appendChild(commentDiv);
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener("DOMContentLoaded", () => showLogin());
