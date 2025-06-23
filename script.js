// =================== IMPORTAÇÕES ===================
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
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

// =================== CONFIGURAÇÕES ===================
const auth = window.firebaseAuth;
const db = getFirestore();
const storage = getStorage();

// =================== LOGIN E REGISTRO ===================
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login feito com sucesso!");
    document.getElementById("project-form").style.display = "block";
  } catch (error) {
    alert("Erro no login: " + error.message);
  }
};

window.register = async function () {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Registro feito com sucesso!");
    showLogin();
  } catch (error) {
    alert("Erro no registro: " + error.message);
  }
};

window.logout = async function () {
  try {
    await signOut(auth);
    alert("Logout realizado com sucesso.");
  } catch (error) {
    alert("Erro no logout: " + error.message);
  }
};

window.showLogin = function () {
  document.getElementById("login-section").style.display = "block";
  document.getElementById("register-section").style.display = "none";
  document.getElementById("project-form").style.display = "none";
};

window.showRegister = function () {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("register-section").style.display = "block";
  document.getElementById("project-form").style.display = "none";
};

onAuthStateChanged(auth, (user) => {
  const loginBtn = document.querySelector('button[onclick="showLogin()"]');
  const logoutBtn = document.querySelector('button[onclick="logout()"]');
  const projectForm = document.getElementById("project-form");

  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
    projectForm.style.display = "block";
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    projectForm.style.display = "none";
  }
});

// =================== ENVIO DO PROJETO ===================
window.submitProject = async function () {
  const title = document.getElementById("project-title").value.trim();
  const description = document.getElementById("project-desc").value.trim();
  const imageFile = document.getElementById("project-image").files[0];
  const videoFile = document.getElementById("project-video")
    ? document.getElementById("project-video").files[0]
    : null;

  if (!title || !description || !imageFile) {
    return alert("Preencha todos os campos obrigatórios e selecione uma imagem.");
  }

  try {
    // ================= UPLOAD IMAGEM =================
    const imageRef = ref(storage, `images/${Date.now()}_${imageFile.name}`);
    await uploadBytes(imageRef, imageFile);
    const imageUrl = await getDownloadURL(imageRef);

    let videoUrl = "";
    if (videoFile) {
      const videoRef = ref(storage, `videos/${Date.now()}_${videoFile.name}`);
      await uploadBytes(videoRef, videoFile);
      videoUrl = await getDownloadURL(videoRef);
    }

    // ================= SALVA NO FIRESTORE =================
    await addDoc(collection(db, "projects"), {
      title,
      description,
      imageUrl,
      videoUrl,
      createdAt: new Date()
    });

    alert("Projeto enviado com sucesso!");
    document.getElementById("project-title").value = "";
    document.getElementById("project-desc").value = "";
    document.getElementById("project-image").value = "";
    if (document.getElementById("project-video")) {
      document.getElementById("project-video").value = "";
    }
  } catch (error) {
    alert("Erro ao enviar projeto: " + error.message);
  }
};

// =================== LISTAR PROJETOS ===================
const projectsContainer = document.getElementById("projects");

function renderProjects(projects) {
  projectsContainer.innerHTML = "";
  projects.forEach((proj) => {
    const div = document.createElement("div");
    div.classList.add("project-card");
    div.innerHTML = `
      <img src="${proj.imageUrl}" alt="${proj.title}" style="max-width:200px;" />
      <h3>${proj.title}</h3>
      <p>${proj.description}</p>
      ${proj.videoUrl ? `<video src="${proj.videoUrl}" controls style="max-width:200px;"></video>` : ""}
    `;
    projectsContainer.appendChild(div);
  });
}

// Atualização em tempo real
onSnapshot(
  query(collection(db, "projects"), orderBy("createdAt", "desc")),
  (snapshot) => {
    const projects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderProjects(projects);
  }
);

// =================== INICIALIZAÇÃO ===================
window.addEventListener("DOMContentLoaded", () => {
  showLogin();
});
// =================== LISTAR PROJETOS DA COMUNIDADE ===================
const projectsContainer = document.getElementById("projects");

function renderProjects(projects) {
  projectsContainer.innerHTML = "";
  projects.forEach((proj) => {
    const div = document.createElement("div");
    div.classList.add("project-card");

    div.innerHTML = `
      <h3>${proj.title}</h3>
      <p>${proj.description}</p>
      ${proj.imageUrl ? `<img src="${proj.imageUrl}" alt="${proj.title}" />` : ""}
      ${proj.videoUrl ? `<video src="${proj.videoUrl}" controls></video>` : ""}
    `;

    projectsContainer.appendChild(div);
  });
}

// Atualização automática a partir do Firestore
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const db = getFirestore();

onSnapshot(
  query(collection(db, "projects"), orderBy("createdAt", "desc")),
  (snapshot) => {
    const projects = snapshot.docs.map((doc) => doc.data());
    renderProjects(projects);
  }
);
