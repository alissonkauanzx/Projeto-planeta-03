// ==================== IMPORTS ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, arrayUnion, getDoc, setDoc, increment
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
  apiKey: "AIzaSyBdWzf45GmW58N7sy7WMT9MG9G4Jy3wjsg",
  authDomain: "planeta-projeto.firebaseapp.com",
  projectId: "planeta-projeto",
  storageBucket: "planeta-projeto.appspot.com",
  messagingSenderId: "1060342659751",
  appId: "1:1060342659751:web:fbd4c421de3a02db8cb982"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "khhRon4qIBZdyaJfVKN6ZiSApgR2";

// ==================== ELEMENTOS ====================
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const projectForm = document.getElementById("project-form");
const postProjectBtn = document.getElementById("post-project-btn");
const logoutBtn = document.getElementById("logout-btn");
const projectsContainer = document.getElementById("projects");
const uploadProgress = document.getElementById("upload-progress");
const uploadMessage = document.getElementById("upload-message");
const fullscreenOverlay = document.getElementById("fullscreen-project");
const fullscreenContent = document.getElementById("fullscreen-data");
const cancelProjectBtn = document.getElementById("cancel-project-btn");

// Cloudinary config
const configMeta = document.querySelector('meta[name="cloudinary-config"]');
const cloudName = configMeta?.dataset.cloudName || "";
const uploadPreset = configMeta?.dataset.uploadPreset || "";

// ==================== UTILITÁRIOS ====================
const show = el => el && (el.style.display = "block");
const hide = el => el && (el.style.display = "none");
function resetForm() {
  projectForm.reset();
  hide(uploadProgress);
  hide(uploadMessage);
}

// ==================== GLOBAL FUNCTIONS ====================
window.showLogin = () => {
  show(loginSection); hide(registerSection); hide(projectForm);
  hide(postProjectBtn); hide(logoutBtn);
  projectsContainer.innerHTML = "";
  hideModal();
};
window.showRegister = () => {
  hide(loginSection); show(registerSection); hide(projectForm);
  hide(postProjectBtn); hide(logoutBtn);
  projectsContainer.innerHTML = "";
  hideModal();
};
window.showProjectForm = () => {
  hide(loginSection); hide(registerSection); show(projectForm);
  resetForm();
  hideModal();
};

// ==================== AUTHENTICATION ====================
window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) return alert("Preencha e-mail e senha.");
  try { await signInWithEmailAndPassword(auth, email, password); }
  catch (e) { alert("Erro no login: " + e.message); console.error(e); }
};
window.register = async () => {
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  if (!email || !password) return alert("Preencha e-mail e senha.");
  try { await createUserWithEmailAndPassword(auth, email, password);
    alert("Conta criada com sucesso!"); window.showLogin();
  } catch (e) { alert("Erro no registro: " + e.message); console.error(e); }
};
window.logout = async () => {
  try { await signOut(auth); }
  catch (e) { alert("Erro ao sair: " + e.message); console.error(e); }
};

onAuthStateChanged(auth, user => {
  if (user) {
    hide(loginSection); hide(registerSection); hide(projectForm);
    show(postProjectBtn); show(logoutBtn);
    loadProjects();
  } else window.showLogin();
});

// ==================== DAILY LIMIT ====================
async function canUpload(newBytes) {
  const today = new Date().toISOString().split("T")[0];
  const ref = doc(db, "dailyUsage", today);
  try {
    const snap = await getDoc(ref);
    const used = snap.exists() ? snap.data().totalBytes : 0;
    if (used + newBytes > MAX_DAILY_BYTES) {
      alert("🚫 Limite diário de 5 GB atingido."); return false;
    }
    snap.exists()
      ? await updateDoc(ref, { totalBytes: increment(newBytes) })
      : await setDoc(ref, { totalBytes: newBytes });
    return true;
  } catch (e) {
    console.error(e);
    alert("Erro no limite diário"); return false;
  }
}

// ==================== UPLOAD ====================
async function uploadToCloudinary(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/upload`, true);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) uploadProgress.value = (e.loaded / e.total)*100;
    };
    xhr.onload = () => {
      hide(uploadProgress); hide(uploadMessage);
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve(res.secure_url);
      } else reject(new Error("Erro no upload"));
    };
    xhr.onerror = () => reject(new Error("Erro de rede"));
    xhr.send(formData);
  });
}

// ==================== SUBMIT PROJECT ====================
window.submitProject = async () => {
  const title = document.getElementById("project-title").value.trim();
  const description = document.getElementById("project-desc").value.trim();
  const imageFile = Array.from(document.getElementById("project-image").files)
                        .find(f => f.type.startsWith("image/"));
  const pdfFile = Array.from(document.getElementById("project-image").files)
                      .find(f => f.type === "application/pdf");
  const videoFile = document.getElementById("project-video").files[0] || null;
  const uid = auth.currentUser?.uid;
  if (!uid || !title || !description) return alert("Campos obrigatórios faltando.");

  const totalBytes =
    (imageFile?.size ||0) + (pdfFile?.size||0) + (videoFile?.size||0);
  if (!(await canUpload(totalBytes))) return;

  const [imageUrl,pdfUrl,videoUrl] = await Promise.all([
    uploadToCloudinary(imageFile),
    uploadToCloudinary(pdfFile),
    uploadToCloudinary(videoFile)
  ]);

  const data = { title, description, createdAt: new Date(), userId: uid, comments: [],
    ...(imageUrl && {imageUrl}), ...(pdfUrl && {pdfUrl}), ...(videoUrl && {videoUrl})
  };
  await addDoc(collection(db, "projects"), data);
  alert("Projeto enviado!"); hide(projectForm); resetForm(); loadProjects();
};

// ==================== LOAD & RENDER PROJECTS ====================
function loadProjects() {
  const q = query(collection(db, "projects"), orderBy("createdAt","desc"));
  onSnapshot(q, snap => {
    projectsContainer.innerHTML = "";
    if (snap.empty) return projectsContainer.innerHTML = "<p>Nenhum projeto encontrado.</p>";
    snap.forEach(docSnap => {
      const p = { id: docSnap.id, ...docSnap.data() };
      const card = renderCard(p);
      projectsContainer.appendChild(card);
    });
  });
}
function renderCard(p) {
  const el = document.createElement("div");
  el.className = "project-card";
  el.innerHTML = `
    <h3>${p.title}</h3>
    <p>${p.description}</p>
    ${p.imageUrl ? `<img src="${p.imageUrl}" alt="Imagem do projeto">` : ""}
    ${p.videoUrl ? `<video src="${p.videoUrl}" controls muted preload="metadata"></video>` : ""}
    ${p.pdfUrl ? `<iframe src="${p.pdfUrl}" class="pdf-view" title="PDF"></iframe>` : ""}
  `;
  el.onclick = () => openProjectView(p);
  return el;
}

// ==================== FULLSCREEN VIEW HANDLING ====================
function showModal() { fullscreenOverlay.style.display = 'block'; }
function hideModal() { fullscreenOverlay.style.display = 'none'; }

function openProjectView(p) {
  projectsContainer.style.display = 'none';
  showModal();

  const isOwner = auth.currentUser?.uid === p.userId || auth.currentUser?.uid === ADMIN_UID;

  fullscreenContent.innerHTML = `
    <div class="full-header">
      <button class="close-btn">Voltar</button>
      ${ isOwner
         ? `<button class="edit-btn">Editar</button><button class="delete-btn">Apagar</button>`
         : ""
      }
    </div>
    <h2>${p.title}</h2>
    <div class="media-container">
      ${p.imageUrl ? `<img src="${p.imageUrl}" class="modal-image">` : ""}
      ${p.videoUrl ? `<video src="${p.videoUrl}" controls class="modal-video"></video>` : ""}
      ${p.pdfUrl ? `<iframe src="${p.pdfUrl}" class="pdf-view" title="PDF"></iframe>` : ""}
    </div>
    <p>${p.description}</p>
    <div class="modal-comments-list"></div>
    <input type="text" id="modal-comment-input" placeholder="Comente..." />
    <button id="modal-comment-btn">Enviar</button>
  `;

  const commentList = fullscreenContent.querySelector(".modal-comments-list");
  (p.comments || []).forEach(c => {
    const el = document.createElement("p");
    el.textContent = `${c.userEmail || "Anônimo"}: ${c.text}`;
    commentList.appendChild(el);
  });

  fullscreenContent.querySelector(".close-btn").onclick = () => {
    hideModal(); fullscreenContent.innerHTML = ""; projectsContainer.style.display = 'grid';
  };

  if (isOwner) {
    fullscreenContent.querySelector(".edit-btn").onclick = () => startEditProject(p);
    fullscreenContent.querySelector(".delete-btn").onclick = () => {
      if (confirm("Apagar este projeto?")) {
        deleteDoc(doc(db, "projects", p.id));
        hideModal(); projectsContainer.style.display = 'grid';
      }
    };
  }

  document.getElementById("modal-comment-btn").onclick = async () => {
    const text = document.getElementById("modal-comment-input").value.trim();
    if (!text) return;
    const user = auth.currentUser;
    const comment = { userId: user.uid, userEmail: user.email, text, createdAt: new Date() };
    await updateDoc(doc(db, "projects", p.id), { comments: arrayUnion(comment) });
    const el = document.createElement("p");
    el.textContent = `${comment.userEmail}: ${comment.text}`;
    commentList.appendChild(el);
    document.getElementById("modal-comment-input").value = "";
  };
}

// ==================== EDIT PROJECT ====================
function startEditProject(p) {
  fullscreenContent.innerHTML = `
    <button class="close-btn">Cancelar</button>
    <h2>Editar Projeto</h2>
    <input type="text" id="edit-title" value="${p.title}" />
    <textarea id="edit-desc">${p.description}</textarea>
    <button id="save-edit-btn">Salvar</button>
  `;
  fullscreenContent.querySelector(".close-btn").onclick = () => openProjectView(p);
  fullscreenContent.querySelector("#save-edit-btn").onclick = async () => {
    const newTitle = document.getElementById("edit-title").value.trim();
    const newDesc = document.getElementById("edit-desc").value.trim();
    await updateDoc(doc(db, "projects", p.id), { title: newTitle, description: newDesc });
    openProjectView({ ...p, title: newTitle, description: newDesc, comments: p.comments });
  };
}

// ==================== EVENT LISTENERS ====================
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-btn").onclick = window.login;
  document.getElementById("register-btn").onclick = window.register;
  document.getElementById("logout-btn").onclick = window.logout;
  document.getElementById("post-project-btn").onclick = window.showProjectForm;
  document.getElementById("submit-project-btn").onclick = window.submitProject;
  document.getElementById("to-register").onclick = e => { e.preventDefault(); window.showRegister(); };
  document.getElementById("to-login").onclick = e => { e.preventDefault(); window.showLogin(); };
  cancelProjectBtn.onclick = () => { hide(projectForm); resetForm(); projectsContainer.style.display = 'grid'; hideModal(); };
});
