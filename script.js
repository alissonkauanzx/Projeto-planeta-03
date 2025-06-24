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
  increment
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

// ==================== CONFIGURAÇÃO ====================
const auth = window.firebaseAuth;
const db = getFirestore();
const storage = getStorage();

const MAX_DAILY_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
const MAX_FILE_SIZE_BYTES = MAX_DAILY_BYTES; // Limite por arquivo individual

// ==================== SELETORES ====================
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const projectForm = document.getElementById("project-form");
const postProjectBtn = document.getElementById("post-project-btn");
const logoutBtn = document.getElementById("logout-btn");
const projectsContainer = document.getElementById("projects");
const uploadProgress = document.getElementById("upload-progress");
const uploadMessage = document.getElementById("upload-message");

// ==================== FUNÇÕES ÚTEIS ====================
function showElement(el) { el.style.display = "block"; }
function hideElement(el) { el.style.display = "none"; }

function resetProjectForm() {
  document.getElementById("project-title").value = "";
  document.getElementById("project-desc").value = "";
  document.getElementById("project-image").value = "";
  document.getElementById("project-video").value = "";
  hideElement(uploadProgress); hideElement(uploadMessage);
}

// ==================== SEÇÕES ====================
window.showLogin = () => { showElement(loginSection); hideElement(registerSection); hideElement(projectForm); };
window.showRegister = () => { hideElement(loginSection); showElement(registerSection); hideElement(projectForm); };
window.showProjectForm = () => { hideElement(loginSection); hideElement(registerSection); showElement(projectForm); };

// ==================== AUTENTICAÇÃO ====================
window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) return alert("Preencha e-mail e senha.");
  try { await signInWithEmailAndPassword(auth, email, password); }
  catch (error) { alert("Erro no login: " + error.message); }
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
  try { await signOut(auth); } catch (error) { alert("Erro ao sair: " + error.message); }
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    hideElement(loginSection); hideElement(registerSection); hideElement(projectForm);
    showElement(postProjectBtn); showElement(logoutBtn); loadProjects();
  } else {
    showLogin();
    hideElement(postProjectBtn); hideElement(logoutBtn); projectsContainer.innerHTML = "";
  }
});

// ==================== LIMITE DE 5 GB POR DIA ====================
async function canUpload(newBytes) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const dailyRef = doc(db, "dailyUsage", today);
  const snap = await getDoc(dailyRef);
  const usedBytes = snap.exists() ? snap.data().totalBytes : 0;

  if (usedBytes + newBytes > MAX_DAILY_BYTES) {
    alert(
      "⚠️ O limite diário de envios (5 GB) foi atingido. Por favor, volte amanhã para enviar novos projetos. 🌱"
    );
    return false;
  }

  if (snap.exists()) {
    await updateDoc(dailyRef, { totalBytes: increment(newBytes) });
  } else {
    await setDoc(dailyRef, { totalBytes: newBytes });
  }
  return true;
}

// ==================== UPLOAD ====================
function uploadFileWithProgress(file, path) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE_BYTES) return reject(new Error(`"${file.name}" excede o limite de 5 GB.`));
    const fileRef = ref(storage, path);
    const task = uploadBytesResumable(fileRef, file);

    showElement(uploadProgress); showElement(uploadMessage);
    uploadProgress.value = 0;
    uploadMessage.textContent = `Enviando "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`;

    task.on(
      "state_changed",
      (snap) => { uploadProgress.value = (snap.bytesTransferred / snap.totalBytes) * 100; },
      (error) => { hideElement(uploadProgress); hideElement(uploadMessage); reject(error); },
      async () => { hideElement(uploadProgress); hideElement(uploadMessage); resolve(await getDownloadURL(task.snapshot.ref)); }
    );
  });
}

// ==================== ENVIO DE PROJETO ====================
window.submitProject = async () => {
  const title = document.getElementById("project-title").value.trim();
  const description = document.getElementById("project-desc").value.trim();
  const imageFile = document.getElementById("project-image").files[0];
  const videoFile = document.getElementById("project-video").files[0];
  const uid = auth.currentUser.uid;

  if (!title || !description || !imageFile) return alert("Preencha todos os campos obrigatórios.");

  const totalBytesToUpload = imageFile.size + (videoFile ? videoFile.size : 0);
  if (!(await canUpload(totalBytesToUpload))) return;

  try {
    const imageUrl = await uploadFileWithProgress(imageFile, `images/${uid}/${Date.now()}-${imageFile.name}`);
    let videoUrl = "";
    if (videoFile) {
      videoUrl = await uploadFileWithProgress(videoFile, `videos/${uid}/${Date.now()}-${videoFile.name}`);
    }

    await addDoc(collection(db, "projects"), {
      title,
      description,
      imageUrl,
      videoUrl,
      createdAt: new Date(),
      userId: uid,
      comments: []
    });

    alert("🎉 Projeto enviado com sucesso!");
    hideElement(projectForm); loadProjects(); resetProjectForm();
  } catch (error) {
    alert(`Erro ao enviar projeto: ${error.message}`);
  }
};

// ==================== PROJETOS ====================
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

function createProjectCard(project) {
  const card = document.createElement("div");
  card.classList.add("project-card", "fade-in");

  card.innerHTML = `
    <h3>${project.title}</h3>
    <p>${project.description}</p>
    ${project.imageUrl ? `<img src="${project.imageUrl}" alt="${project.title}" />` : ""}
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
  card.querySelector(".btn-comment").addEventListener("click", async () => {
    const inputComment = card.querySelector(".new-comment input");
    const text = inputComment.value.trim();
    if (!text) return;

    const commentData = {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      text,
      createdAt: new Date()
    };
    await updateDoc(doc(db, "projects", project.id), { comments: arrayUnion(commentData) });
    addCommentToList(list, commentData); inputComment.value = "";
  });

  return card;
}

function addCommentToList(container, comment) {
  const div = document.createElement("div");
  div.classList.add("comment");
  const dateStr = new Date(comment.createdAt.seconds ? comment.createdAt.seconds * 1000 : comment.createdAt).toLocaleString();
  div.innerHTML = `<p><strong>${comment.userEmail}</strong> <em>(${dateStr})</em></p><p>${comment.text}</p>`;
  container.appendChild(div);
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener("DOMContentLoaded", showLogin);
