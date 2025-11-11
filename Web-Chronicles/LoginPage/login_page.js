class LoginPage {
    constructor() {
        document.getElementById("loginBtn").addEventListener("click", function() {
        window.location.href = "../mainpage/index.html";
        });
    }
}

window.onload = function() {
    new LoginPage();
};