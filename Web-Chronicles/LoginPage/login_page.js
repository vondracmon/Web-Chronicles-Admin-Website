class LoginPage {
    constructor() {
        document.getElementById("loginBtn").addEventListener("click", () => {
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(() => {
                    alert("Login successful!");
                    window.location.href = "../mainpage/index.html";
                })
                .catch(error => {
                    alert(error.message);
                });
        });
    }
}

window.onload = () => {
    new LoginPage();
};
