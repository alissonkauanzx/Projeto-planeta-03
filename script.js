import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const auth = window.firebaseAuth;

window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      alert("Login feito com sucesso!");
      document.getElementById("login-section").style.display = "none";
      document.getElementById("register-section").style.display = "none";
      document.getElementById("project-form").style.display = "block";
    })
    .catch(error => {
      alert("Erro no login: " + error.message);
    });
};

window.register = function () {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(userCredential => {
      alert("Registro feito com sucesso!");
      showLogin();
    })
    .catch(error => {
      alert("Erro no registro: " + error.message);
    });
};

window.logout = function () {
  signOut(auth)
    .then(() => {
      alert("Logout realizado com sucesso.");
      document.getElementById("project-form").style.display = "none";
      showLogin();
    });
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

window.addEventListener("DOMContentLoaded", () => {
  showLogin();
});
