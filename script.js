// ==================== IMPORTS ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot,
  doc, updateDoc, arrayUnion, getDoc, setDoc, increment, deleteDoc
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
const projectDetail = document.getElementById("project-detail-section");
const header = document.querySelector("header");

// ==================== CLOUDINARY ====================
const configMeta = document.querySelector('meta[name="cloudinary-config"]');
const cloudName = configMeta.dataset.cloudName;
const uploadPreset = configMeta.dataset.uploadPreset;

// ==================== UTILITÁRIOS ====================
const show = el => el && (el.style.display = "block");
const hide = el => el && (el.style.display = "none");

function resetForm() {
  document.getElementById("project-title").value = "";
  document.getElementById("project-desc").value = "";
  document.getElementById("project-image").value = "";
  document.getElementById("project-video").value = "";
  hide(uploadProgress);
  hide(uploadMessage);
  projectForm.dataset.editing = "";
}

function showSection(sectionId) {
  document.querySelectorAll("main > section").forEach(sec => hide(sec));
  const sec = document.querySelector(sectionId);
  if (sec) show(sec);
}

// ==================== AUTENTICAÇÃO ====================
window.login = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) return alert("Preencha e-mail e senha.");
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert("Erro no login: " + e.message);
  }
};

window.register = async () => {
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  if (!email || !password) return alert("Preencha e-mail e senha.");
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Conta criada com sucesso!");
    window.showLogin();
  } catch (e) {
    alert("Erro no registro: " + e.message);
  }
};

window.logout = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    alert("Erro ao sair: " + e.message);
  }
};

// ==================== INTERFACE ====================
window.showLogin = () => {
  showSection("#login-section");
  hide(postProjectBtn);
  hide(logoutBtn);
  header.style.display = "block";
};

window.showRegister = () => {
  showSection("#register-section");
  hide(postProjectBtn);
  hide(logoutBtn);
  header.style.display = "block";
};

window.showProjectForm = () => {
  showSection("#project-form");
  resetForm();
  hide(postProjectBtn);
  hide(logoutBtn);
  header.style.display = "none";
};

document.addEventListener("DOMContentLoaded", () => {
  // Botão cancelar formulário de projeto
  document.getElementById("cancel-project-btn").addEventListener("click", () => {
    resetForm();
    hide(projectForm);
    showSection("#projects-section");
    show(postProjectBtn);
    show(logoutBtn);
    header.style.display = "block";
  });

  // Outros event listeners
  document.getElementById("login-btn").addEventListener("click", window.login);
  document.getElementById("register-btn").addEventListener("click", window.register);
  document.getElementById("logout-btn").addEventListener("click", window.logout);
  document.getElementById("post-project-btn").addEventListener("click", window.showProjectForm);
  document.getElementById("submit-project-btn").addEventListener("click", window.submitProject);
  document.getElementById("to-register").addEventListener("click", e => {
    e.preventDefault();
    window.showRegister();
  });
  document.getElementById("to-login").addEventListener("click", e => {
    e.preventDefault();
    window.showLogin();
  });
  document.getElementById("back-to-projects-btn").addEventListener("click", () => {
    showSection("#projects-section");
    show(postProjectBtn);
    show(logoutBtn);
    header.style.display = "block";
  });
});

// ==================== VERIFICAÇÃO LOGIN ====================
onAuthStateChanged(auth, user => {
  if (user) {
    show(postProjectBtn);
    show(logoutBtn);
    header.style.display = "block";
    showSection("#projects-section");
    loadProjects();
  } else {
    window.showLogin();
  }
});

// ==================== LIMITE DIÁRIO ====================
const MAX_DAILY_BYTES = 5 * 1024 * 1024 * 1024;
async function canUpload(newBytes) {
  const today = new Date().toISOString().split("T")[0];
  const ref = doc(db, "dailyUsage", today);
  try {
    const snap = await getDoc(ref);
    const used = snap.exists() ? snap.data().totalBytes : 0;
    if (used + newBytes > MAX_DAILY_BYTES) {
      alert("🚫 Limite diário de 5 GB atingido.");
      return false;
    }
    if (snap.exists()) {
      await updateDoc(ref, { totalBytes: increment(newBytes) });
    } else {
      await setDoc(ref, { totalBytes: newBytes });
    }
    return true;
  } catch (e) {
    console.error("Erro ao verificar limite:", e);
    return false;
  }
}

// ==================== UPLOAD CLOUDINARY ====================
async function uploadToCloudinary(file) {
  if (!file) return null;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/upload`);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        uploadProgress.value = (e.loaded / e.total) * 100;
        uploadMessage.textContent = `Enviando "${file.name}"...`;
        show(uploadProgress);
        show(uploadMessage);
      }
    };
    xhr.onload = () => {
      hide(uploadProgress);
      hide(uploadMessage);
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText).secure_url);
      } else reject("Erro no upload");
    };
    xhr.onerror = () => reject("Erro de rede");
    xhr.send(formData);
  });
}

// ==================== ENVIO OU EDIÇÃO DE PROJETO ====================
window.submitProject = async () => {
  const title = document.getElementById("project-title").value.trim();
  const description = document.getElementById("project-desc").value.trim();
  const imageInput = document.getElementById("project-image");
  const videoInput = document.getElementById("project-video");
  const uid = auth.currentUser?.uid;

  if (!title || !description || !uid) return alert("Preencha tudo!");

  let imageFile = null, pdfFile = null;
  for (const f of imageInput.files) {
    if (f.type === "application/pdf") pdfFile = f;
    else if (f.type.startsWith("image/")) imageFile = f;
  }
  const videoFile = videoInput?.files[0] || null;
  const totalBytes = (imageFile?.size || 0) + (pdfFile?.size || 0) + (videoFile?.size || 0);
  if (!(await canUpload(totalBytes))) return;

  try {
    const [imageUrl, pdfUrl, videoUrl] = await Promise.all([
      uploadToCloudinary(imageFile),
      uploadToCloudinary(pdfFile),
      uploadToCloudinary(videoFile)
    ]);

    const editingId = projectForm.dataset.editing;

    const data = {
      title, description, userId: uid, comments: [],
      createdAt: new Date(),
      ...(imageUrl && { imageUrl }),
      ...(pdfUrl && { pdfUrl }),
      ...(videoUrl && { videoUrl })
    };

    if (editingId) {
      delete data.createdAt;
      await updateDoc(doc(db, "projects", editingId), data);
      alert("Projeto atualizado!");
    } else {
      await addDoc(collection(db, "projects"), data);
      alert("Projeto postado!");
    }

    resetForm();
    hide(projectForm);
    loadProjects();
    showSection("#projects-section");
    show(postProjectBtn);
    show(logoutBtn);
    header.style.display = "block";
  } catch (e) {
    alert("Erro ao enviar projeto.");
    console.error(e);
  }
};

// ==================== LISTAGEM ====================
function loadProjects() {
  const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
  onSnapshot(q, snap => {
    projectsContainer.innerHTML = "";
    if (snap.empty) {
      projectsContainer.innerHTML = "<p>Nenhum projeto postado ainda.</p>";
      return;
    }
    snap.forEach(docSnap => {
      const p = { id: docSnap.id, ...docSnap.data() };
      projectsContainer.appendChild(renderCard(p));
    });
  });
}

function renderCard(p) {
  const user = auth.currentUser;
  const isOwner = user && (p.userId === user.uid || user.uid === ADMIN_UID);

  const el = document.createElement("div");
  el.className = "project-card";
  el.innerHTML = `
    <h3>${p.title}</h3>
    <p>${p.description}</p>
    ${p.imageUrl ? `<img src="${p.imageUrl}" />` : ""}
    ${p.videoUrl ? `<video src="${p.videoUrl}" controls muted></video>` : ""}
    ${p.pdfUrl ? `<iframe src="${p.pdfUrl}" class="pdf-view"></iframe>` : ""}
    ${isOwner ? `
      <button class="edit-btn">Editar</button>
      <button class="delete-btn">Apagar</button>` : ""}
  `;

  el.addEventListener("click", () => openProjectDetail(p));

  if (isOwner) {
    el.querySelector(".edit-btn").onclick = (e) => {
      e.stopPropagation();
      showSection("#project-form");
      document.getElementById("project-title").value = p.title;
      document.getElementById("project-desc").value = p.description;
      projectForm.dataset.editing = p.id;
      hide(postProjectBtn);
      hide(logoutBtn);
      header.style.display = "none";
    };
    el.querySelector(".delete-btn").onclick = async (e) => {
      e.stopPropagation();
      if (confirm("Tem certeza que deseja apagar este projeto?")) {
        await deleteDoc(doc(db, "projects", p.id));
        alert("Projeto apagado.");
      }
    };
  }

  return el;
}

// ==================== DETALHES DO PROJETO ====================
function openProjectDetail(p) {
  showSection("#project-detail-section");
  hide(postProjectBtn);
  hide(logoutBtn);
  header.style.display = "none";

  document.getElementById("detail-title").textContent = p.title;
  document.getElementById("detail-description").textContent = p.description;

  const media = document.getElementById("detail-media");
  media.innerHTML = `
    ${p.imageUrl ? `<img src="${p.imageUrl}" />` : ""}
    ${p.videoUrl ? `<video src="${p.videoUrl}" controls></video>` : ""}
    ${p.pdfUrl ? `<iframe src="${p.pdfUrl}" class="pdf-view"></iframe>` : ""}
  `;

  const commentList = document.getElementById("detail-comments-list");
  commentList.innerHTML = "";
  (p.comments || []).forEach(c => {
    const el = document.createElement("p");
    el.textContent = `${c.userEmail || "Anônimo"}: ${c.text}`;
    commentList.appendChild(el);
  });

  document.getElementById("detail-comment-input").value = "";
  document.getElementById("detail-comment-btn").onclick = async () => {
    const text = document.getElementById("detail-comment-input").value.trim();
    const user = auth.currentUser;
    if (!text || !user) return;
    const comment = {
      userId: user.uid,
      userEmail: user.email,
      text,
      createdAt: new Date()
    };
    await updateDoc(doc(db, "projects", p.id), {
      comments: arrayUnion(comment)
    });
    const el = document.createElement("p");
    el.textContent = `${comment.userEmail}: ${comment.text}`;
    commentList.appendChild(el);
    document.getElementById("detail-comment-input").value = "";
  };
}
