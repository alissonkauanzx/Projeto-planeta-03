// ===================== IMPORTS =====================
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
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js";

// ===================== INICIALIZAÇÕES =====================
const auth = window.firebaseAuth;
const db = getFirestore();
const storage = getStorage();

// ===================== UTILITÁRIOS =====================
function showElement(el) {
  el.style.display = "block";
}
function hideElement(el) {
  el.style.display = "none";
}

// ===================== CONTROLE DE VISIBILIDADE =====================
const loginSection = document.getElementById("login-section");
const registerSection = document.getElementById("register-section");
const projectForm = document.getElementById("project-form");
const postProjectBtn = document.getElementById("post-project-btn");
const logoutBtn = document.getElementById("logout-btn");
const projectsContainer = document.getElementById("projects");

// ===================== AUTENTICAÇÃO =====================
window.login = async function () {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) return alert("Preencha e-mail e senha.");

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert("Erro no login: " + error.message);
  }
};

window.register = async function () {
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

window.logout = async function () {
  try {
    await signOut(auth);
  } catch (error) {
    alert("Erro ao sair: " + error.message);
  }
};

window.showLogin = function () {
  showElement(loginSection);
  hideElement(registerSection);
  hideElement(projectForm);
};

window.showRegister = function () {
  hideElement(loginSection);
  showElement(registerSection);
  hideElement(projectForm);
};

window.showProjectForm = function () {
  hideElement(loginSection);
  hideElement(registerSection);
  showElement(projectForm);
};

// ===================== ESTADO DE AUTENTICAÇÃO =====================
onAuthStateChanged(auth, (user) => {
  if (user) {
    hideElement(loginSection);
    hideElement(registerSection);
    hideElement(projectForm);
    postProjectBtn.style.display = "inline-block";
    logoutBtn.style.display = "inline-block";
    loadProjects(); // carregar projetos quando estiver logado
  } else {
    showLogin();
    postProjectBtn.style.display = "none";
    logoutBtn.style.display = "none";
    projectsContainer.innerHTML = ""; // limpa lista de projetos se deslogar
  }
});

// ===================== ENVIO DE PROJETO =====================
window.submitProject = async function () {
  const title = document.getElementById("project-title").value.trim();
  const description = document.getElementById("project-desc").value.trim();
  const imageFile = document.getElementById("project-image").files[0];
  const videoFile = document.getElementById("project-video").files[0];

  if (!title || !description || !imageFile) {
    return alert("Preencha título, descrição e selecione uma imagem.");
  }

  try {
    // Upload imagem
    const imageRef = ref(storage, `images/${Date.now()}_${imageFile.name}`);
    await uploadBytes(imageRef, imageFile);
    const imageUrl = await getDownloadURL(imageRef);

    // Upload vídeo opcional
    let videoUrl = "";
    if (videoFile) {
      const videoRef = ref(storage, `videos/${Date.now()}_${videoFile.name}`);
      await uploadBytes(videoRef, videoFile);
      videoUrl = await getDownloadURL(videoRef);
    }

    // Salva projeto no Firestore
    const projectData = {
      title,
      description,
      imageUrl,
      videoUrl,
      createdAt: new Date(),
      userId: auth.currentUser.uid,
      comments: [] // iniciar lista de comentários vazia
    };

    await addDoc(collection(db, "projects"), projectData);

    alert("Projeto enviado com sucesso!");
    // Limpa campos
    document.getElementById("project-title").value = "";
    document.getElementById("project-desc").value = "";
    document.getElementById("project-image").value = "";
    document.getElementById("project-video").value = "";

    // Voltar para lista de projetos
    hideElement(projectForm);
    loadProjects();

  } catch (error) {
    alert("Erro ao enviar projeto: " + error.message);
  }
};

// ===================== RENDERIZAÇÃO DOS PROJETOS COM COMENTÁRIOS =====================
async function loadProjects() {
  projectsContainer.innerHTML = "<p>Carregando projetos...</p>";

  const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      projectsContainer.innerHTML = "<p>Nenhum projeto postado ainda.</p>";
      return;
    }

    projectsContainer.innerHTML = "";

    snapshot.docs.forEach((docSnap) => {
      const project = { id: docSnap.id, ...docSnap.data() };
      const projectCard = createProjectCard(project);
      projectsContainer.appendChild(projectCard);
    });
  });
}

// Cria o card do projeto com a área de comentários
function createProjectCard(project) {
  const card = document.createElement("div");
  card.classList.add("project-card");

  // Conteúdo principal do projeto
  card.innerHTML = `
    <h3>${project.title}</h3>
    <p>${project.description}</p>
    ${project.imageUrl ? `<img src="${project.imageUrl}" alt="${project.title}"/>` : ""}
    ${project.videoUrl ? `<video src="${project.videoUrl}" controls></video>` : ""}
    <hr/>
    <div class="comments-section" id="comments-${project.id}">
      <h4>Comentários</h4>
      <div class="comments-list"></div>
      <textarea placeholder="Escreva seu comentário aqui..." rows="3"></textarea>
      <button class="btn-comment">Enviar Comentário</button>
    </div>
  `;

  // Evento para enviar comentário
  const sendBtn = card.querySelector(".btn-comment");
  const textarea = card.querySelector("textarea");
  const commentsList = card.querySelector(".comments-list");

  sendBtn.addEventListener("click", async () => {
    const text = textarea.value.trim();
    if (!text) return alert("Digite um comentário antes de enviar.");

    const commentData = {
      userId: auth.currentUser.uid,
      userEmail: auth.currentUser.email,
      text,
      createdAt: new Date()
    };

    try {
      // Adiciona comentário ao projeto no Firestore (campo comments é array)
      const projectRef = doc(db, "projects", project.id);
      await updateDoc(projectRef, {
        comments: arrayUnion(commentData)
      });

      textarea.value = "";
      // Atualiza comentários na UI
      addCommentToList(commentsList, commentData);

    } catch (error) {
      alert("Erro ao enviar comentário: " + error.message);
    }
  });

  // Renderiza comentários já existentes
  const commentsArray = project.comments || [];
  commentsArray.forEach(comment => addCommentToList(commentsList, comment));

  return card;
}

// Adiciona um comentário à lista visualmente
function addCommentToList(container, comment) {
  const commentDiv = document.createElement("div");
  commentDiv.classList.add("comment");
  const dateStr = new Date(comment.createdAt.seconds ? comment.createdAt.seconds * 1000 : comment.createdAt).toLocaleString();

  commentDiv.innerHTML = `
    <p><strong>${comment.userEmail}</strong> <em>(${dateStr})</em></p>
    <p>${comment.text}</p>
  `;

  container.appendChild(commentDiv);
}

// ===================== INICIALIZAÇÃO =====================
window.addEventListener("DOMContentLoaded", () => {
  showLogin();
  loadProjects();
});
