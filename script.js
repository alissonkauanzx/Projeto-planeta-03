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

// =================== FUNÇÕES DE AUTENTICAÇÃO ===================
window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("Login feito com sucesso!");
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

window.showProjectForm = function () {
  document.getElementById("project-form").style.display = "block";
  document.getElementById("login-section").style.display = "none";
  document.getElementById("register-section").style.display = "none";
};

// =================== ESTADO DE AUTENTICAÇÃO ===================
onAuthStateChanged(auth, (user) => {
  const loginSection = document.getElementById("login-section");
  const registerSection = document.getElementById("register-section");
  const projectForm = document.getElementById("project-form");
  const postProjectBtn = document.getElementById("post-project-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (user) {
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    projectForm.style.display = "none";
    postProjectBtn.style.display = "inline-block";
    logoutBtn.style.display = "inline-block";
  } else {
    loginSection.style.display = "block";
    registerSection.style.display = "none";
    projectForm.style.display = "none";
    postProjectBtn.style.display = "none";
    logoutBtn.style.display = "none";
  }
});

// =================== ENVIO DO PROJETO ===================
window.submitProject = async function () {
  const title = document.getElementById("project-title").value.trim();
  const description = document.getElementById("project-desc").value.trim();
  const imageFile = document.getElementById("project-image").files[0];
  const videoFile = document.getElementById("project-video").files[0];

  if (!title || !description || !imageFile) {
    return alert("Preencha todos os campos obrigatórios e selecione uma imagem.");
  }

  try {
    // Upload da imagem
    const imageRef = ref(storage, `images/${Date.now()}_${imageFile.name}`);
    await uploadBytes(imageRef, imageFile);
    const imageUrl = await getDownloadURL(imageRef);

    // Upload do vídeo (se existir)
    let videoUrl = "";
    if (videoFile) {
      const videoRef = ref(storage, `videos/${Date.now()}_${videoFile.name}`);
      await uploadBytes(videoRef, videoFile);
      videoUrl = await getDownloadURL(videoRef);
    }

    // Salva o projeto no Firestore
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
    document.getElementById("project-video").value = "";
  } catch (error) {
    alert("Erro ao enviar projeto: " + error.message);
  }
};

// =================== LISTAGEM DE PROJETOS ===================
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
