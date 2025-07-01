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

document.addEventListener("DOMContentLoaded", () => {
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

  // ==================== CONSTANTES ====================
  const ADMIN_UID = "khhRon4qIBZdyaJfVKN6ZiSApgR2";
  const MAX_DAILY_BYTES = 5 * 1024 * 1024 * 1024; // 5GB

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
  const header = document.querySelector("header");

  // ==================== CLOUDINARY CONFIG ====================
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

  // ==================== FUNÇÕES GLOBAIS ====================
  function showLogin() {
    show(loginSection);
    hide(registerSection);
    hide(projectForm);
    hide(postProjectBtn);
    hide(logoutBtn);
    projectsContainer.innerHTML = "";
    hideModal();
  }

  function showRegister() {
    hide(loginSection);
    show(registerSection);
    hide(projectForm);
    hide(postProjectBtn);
    hide(logoutBtn);
    projectsContainer.innerHTML = "";
    hideModal();
  }

  function showProjectForm() {
    hide(loginSection);
    hide(registerSection);
    show(projectForm);
    resetForm();
    hideModal();
  }

  // ==================== LOGIN, REGISTRO E LOGOUT ====================
  async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!email || !password) return alert("Preencha e-mail e senha.");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // login bem-sucedido: o onAuthStateChanged vai cuidar do resto
    } catch (e) {
      alert("Erro no login: " + e.message);
      console.error(e);
    }
  }

  async function register() {
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    if (!email || !password) return alert("Preencha e-mail e senha.");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Conta criada com sucesso!");
      showLogin();
    } catch (e) {
      alert("Erro no registro: " + e.message);
      console.error(e);
    }
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (e) {
      alert("Erro ao sair: " + e.message);
      console.error(e);
    }
  }

  // ==================== AUTENTICAÇÃO ====================
  onAuthStateChanged(auth, user => {
    if (user) {
      hide(loginSection);
      hide(registerSection);
      hide(projectForm);
      show(postProjectBtn);
      show(logoutBtn);
      loadProjects();
    } else {
      showLogin();
    }
  });

  // ==================== LIMITE DIÁRIO ====================
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
      alert("Erro ao verificar limite de upload.");
      return false;
    }
  }

  // ==================== UPLOAD ====================
  async function uploadToCloudinary(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      xhr.open("POST", url, true);
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          uploadProgress.value = (e.loaded / e.total) * 100;
          uploadMessage.textContent = `Enviando "${file.name}"`;
          show(uploadProgress);
          show(uploadMessage);
        }
      };
      xhr.onload = () => {
        hide(uploadProgress);
        hide(uploadMessage);
        if (xhr.status === 200) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.secure_url);
          } catch {
            reject(new Error("Erro ao interpretar resposta"));
          }
        } else {
          reject(new Error("Erro no upload Cloudinary"));
        }
      };
      xhr.onerror = () => reject(new Error("Erro de rede no upload"));
      xhr.send(formData);
    });
  }

  // ==================== SUBMISSÃO DE PROJETO ====================
  async function submitProject() {
    const title = document.getElementById("project-title").value.trim();
    const description = document.getElementById("project-desc").value.trim();
    const imageInput = document.getElementById("project-image");
    const videoInput = document.getElementById("project-video");
    const uid = auth.currentUser?.uid;
    if (!uid || !title || !description) return alert("Preencha todos os campos obrigatórios.");

    let imageFile = null;
    let pdfFile = null;
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

      const data = {
        title,
        description,
        createdAt: new Date(),
        userId: uid,
        comments: [],
        ...(imageUrl && { imageUrl }),
        ...(pdfUrl && { pdfUrl }),
        ...(videoUrl && { videoUrl })
      };

      await addDoc(collection(db, "projects"), data);
      alert("Projeto enviado!");
      hide(projectForm);
      resetForm();
      loadProjects();
    } catch (e) {
      alert("Erro ao enviar projeto: " + e.message);
      console.error(e);
    }
  }

  // ==================== LISTAGEM DE PROJETOS ====================
  function loadProjects() {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    onSnapshot(q, snapshot => {
      projectsContainer.innerHTML = "";
      snapshot.forEach(docSnap => {
        const p = { id: docSnap.id, ...docSnap.data() };
        projectsContainer.appendChild(renderCard(p));
      });
    });
  }

  // ==================== RENDER CARD ====================
  function renderCard(p) {
    const el = document.createElement("div");
    el.className = "project-card";
    el.innerHTML = `
      <h3>${p.title}</h3>
      <p>${p.description}</p>
      ${p.imageUrl ? `<img src="${p.imageUrl}" alt="Imagem do projeto" />` : ""}
      ${p.videoUrl ? `<video src="${p.videoUrl}" controls muted preload="metadata" class="project-video"></video>` : ""}
      ${p.pdfUrl ? `<iframe src="${p.pdfUrl}" class="pdf-view" title="PDF do projeto"></iframe>` : ""}
    `;
    el.onclick = () => openProjectView(p);
    return el;
  }

  // ==================== FULLSCREEN MODAL ====================
  function showModal() {
    fullscreenOverlay.classList.add("active");
    header.style.display = "none";
  }

  function hideModal() {
    fullscreenOverlay.classList.remove("active");
    header.style.display = "";
  }

  function openProjectView(p) {
    projectsContainer.style.display = "none";
    showModal();

    fullscreenContent.innerHTML = `
      <div class="top-right-buttons">
        <button id="edit-btn">Editar</button>
        <button id="delete-btn">Apagar</button>
      </div>
      <h2>${p.title}</h2>
      <div class="media-container">
        ${p.imageUrl ? `<img src="${p.imageUrl}" class="modal-image" />` : ""}
        ${p.videoUrl ? `<video src="${p.videoUrl}" controls class="modal-video"></video>` : ""}
        ${p.pdfUrl ? `<iframe src="${p.pdfUrl}" class="pdf-view"></iframe>` : ""}
      </div>
      <p>${p.description}</p>
      <div class="modal-comments-list"></div>
      <input type="text" id="modal-comment-input" placeholder="Comente..." />
      <button id="modal-comment-btn">Enviar</button>
      <button class="close-btn">Voltar</button>
    `;

    // Comentários
    const list = fullscreenContent.querySelector(".modal-comments-list");
    (p.comments || []).forEach(c => {
      const el = document.createElement("p");
      el.textContent = `${c.userEmail || "Anônimo"}: ${c.text}`;
      list.appendChild(el);
    });

    // Comentar
    document.getElementById("modal-comment-btn").onclick = async () => {
      const text = document.getElementById("modal-comment-input").value.trim();
      if (!text || !auth.currentUser) return alert("Precisa estar logado.");
      const comment = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        text,
        createdAt: new Date()
      };
      try {
        await updateDoc(doc(db, "projects", p.id), { comments: arrayUnion(comment) });
        const el = document.createElement("p");
        el.textContent = `${comment.userEmail}: ${comment.text}`;
        list.appendChild(el);
        document.getElementById("modal-comment-input").value = "";
      } catch (e) {
        alert("Erro ao comentar: " + e.message);
      }
    };

    // Editar
    document.getElementById("edit-btn").onclick = async () => {
      const newTitle = prompt("Novo título:", p.title);
      const newDesc = prompt("Nova descrição:", p.description);
      if (newTitle && newDesc) {
        try {
          await updateDoc(doc(db, "projects", p.id), {
            title: newTitle,
            description: newDesc
          });
          alert("Projeto atualizado.");
          hideModal();
        } catch (e) {
          alert("Erro ao editar: " + e.message);
        }
      }
    };

    // Apagar
    document.getElementById("delete-btn").onclick = async () => {
      if (confirm("Tem certeza que deseja apagar este projeto?")) {
        try {
          await deleteDoc(doc(db, "projects", p.id));
          alert("Projeto apagado.");
          hideModal();
        } catch (e) {
          alert("Erro ao apagar: " + e.message);
        }
      }
    };

    // Botão de fechar
    fullscreenContent.querySelector(".close-btn").onclick = () => {
      hideModal();
      fullscreenContent.innerHTML = "";
      projectsContainer.style.display = "grid";
    };
  }

  // ==================== VINCULA FUNÇÕES A WINDOW ====================
  window.showLogin = showLogin;
  window.showRegister = showRegister;
  window.showProjectForm = showProjectForm;
  window.login = login;
  window.register = register;
  window.logout = logout;
  window.submitProject = submitProject;

  // ==================== EVENTOS ====================
  document.getElementById("login-btn").addEventListener("click", login);
  document.getElementById("register-btn").addEventListener("click", register);
  document.getElementById("logout-btn").addEventListener("click", logout);
  document.getElementById("post-project-btn").addEventListener("click", showProjectForm);
  document.getElementById("submit-project-btn").addEventListener("click", submitProject);
  document.getElementById("cancel-project-btn").addEventListener("click", () => {
    resetForm();
    hide(projectForm);
  });
  document.getElementById("to-register").addEventListener("click", e => {
    e.preventDefault();
    showRegister();
  });
  document.getElementById("to-login").addEventListener("click", e => {
    e.preventDefault();
    showLogin();
  });
});
