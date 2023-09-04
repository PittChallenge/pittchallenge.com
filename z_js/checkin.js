"use strict";

function camelCaseToTitleCase(string) {
    return string.replace(/([A-Z])/g, ' $1')
        .replace(/^./, function(str){ return str.toUpperCase(); });
}

window.addEventListener('DOMContentLoaded', function() {
    const eventName = new URLSearchParams(window.location.search).get("eventName");
    if (eventName) {
        document.getElementById("eventName").innerHTML = camelCaseToTitleCase(eventName.substring(6));
    } else {
        document.body.classList.add("error");
        document.getElementById("checkInForm").style.display = "none";

        document.getElementById("result").style.display = "block";
        document.getElementById("result").style.transform = "scale(1)";
        document.getElementById("resultIcon").classList = "fa fa-times";
        document.getElementById("resultText").innerHTML = "Event name not found";
    }

    const email = window.localStorage.getItem("email");
    if (email) document.getElementById("email").value = email;
    document.getElementById("newEmail").value = "";
});

window.addEventListener('load', function() {
    const proxyURL = "https://firebase-proxy-pittchallenge.shahvivswan.workers.dev/";

    document.getElementById("checkInForm").addEventListener("submit", function(e) {
        e.preventDefault();
        const eventName = new URLSearchParams(window.location.search).get("eventName");
        const email = document.getElementById("email").value;
        const newEmail = document.getElementById("newEmail").value;
        document.getElementById("resultText").innerHTML = "";

        if (!(email.endsWith(".edu") || email.indexOf("+") > 0 || newEmail.endsWith(".edu"))) {
            document.getElementById("newEmail").style.display = "block";
            document.getElementById("newEmail").setAttribute("required", "");
            document.getElementById("newEmail").focus();
            return;
        }

        let startingPromise = new Promise(function(resolve, reject) { resolve(); });
        startingPromise = startingPromise.then(function() {
            document.getElementById("pending").style.transform = "scale(1)";
        });
        if (newEmail) {
            startingPromise = startingPromise.then(function() {
                const changeEmailURL = proxyURL + "?proxyOf=change_email";
                console.log("Changing email", email, newEmail, changeEmailURL);
                return fetch(changeEmailURL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email,
                        newEmail: newEmail
                    })
                });
            }).then(function(response) {
                return Promise.all([response, response.text()]);
            }).then(function(results) {
                const response = results[0];
                const text = results[1];
                console.log(response.status, text);

                if (response.status !== 200) throw new Error(text);

                document.getElementById("resultText").innerHTML += "Email changed to " + newEmail + "<br>";
                document.getElementById("resultIcon").classList = "fa fa-check";
            });
        }

        startingPromise = startingPromise.then(function() {
            const checkInURL = proxyURL + "?proxyOf=check_in";
            console.log("Checking in", eventName, email, checkInURL);
            return fetch(checkInURL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    event: eventName,
                    email: newEmail || email
                })
            });
        }).then(function(response) {
            return Promise.all([response, response.text()]);
        }).then(function(results) {
            const response = results[0];
            const text = results[1];

            console.log(response.status, text);
            if (response.status !== 200) throw new Error(text);

            const json = JSON.parse(text);
            console.log(response.status, json);
            document.getElementById("resultIcon").classList = "fa " + json.icon;
            document.getElementById("resultText").innerHTML += "Successfully checked in<br>" + json.id + "<br>" + json.email;
            window.localStorage.setItem("email", newEmail || email);
        }).then(function () {
            document.body.classList.add("ok");
            document.getElementById("checkInForm").style.display = "none";

            document.getElementById("pending").style.transform = "scale(0)";
            document.getElementById("result").style.display = "block";
            document.getElementById("result").style.transform = "scale(1)";
        });

        startingPromise.catch(function(error) {
            document.body.classList.add("error");
            document.getElementById("checkInForm").style.display = "none";

            document.getElementById("pending").style.transform = "scale(0)";
            document.getElementById("result").style.display = "block";
            document.getElementById("result").style.transform = "scale(1)";
            document.getElementById("resultIcon").classList = "fa fa-times";
            document.getElementById("resultText").innerHTML = error;
            console.error(error);
        })
    });
});