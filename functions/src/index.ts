// See a full list of supported triggers at https://firebase.google.com/docs/functions

import {timingSafeEqual} from "crypto";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/v2/https";
import {defineString} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

const app = initializeApp();
const db = getFirestore(app);

function checkReadKey(key: string | undefined): boolean {
    if (!key) return false;

    const enc = new TextEncoder();
    const writeApiKey = enc.encode(defineString("READ_API_KEY").value());
    const userApiKey = enc.encode(String(key));
    return timingSafeEqual(userApiKey, writeApiKey);
}

function checkWriteKey(key: string | undefined): boolean {
    if (!key) return false;

    const enc = new TextEncoder();
    const writeApiKey = enc.encode(defineString("WRITE_API_KEY").value());
    const userApiKey = enc.encode(String(key));
    return timingSafeEqual(userApiKey, writeApiKey);
}

export const addRegistrationEntry = onRequest({
    cors: true,
    timeoutSeconds: 60,
    cpu: 1,
    invoker: "public",
    maxInstances: 5,
}, (request, response) => {
    if (request.method !== "POST") { response.status(400).send("Invalid request #01"); return; }
    if (request.body === undefined) { response.status(400).send("Invalid request #02"); return; }

    const contentType = request.get("content-type");
    if (contentType !== "application/json") { response.status(400).send("Invalid request #03"); return; }

    if (!checkWriteKey(String(request.query.key))) { response.status(401).send("Unauthorized"); return; }

    const json = request.body;
    if (json === undefined) { response.status(400).send("Invalid request #04"); return; }
    if (json.id === undefined) { response.status(400).send("Invalid request #05"); return; }
    if (json.email === undefined) { response.status(400).send("Invalid request #06"); return; }

    json.email = json.email.toLowerCase().trim();
    return Promise.all([
        db.collection("registrations_id").doc(json.id).set(json),
        db.collection("registrations_email").doc(json.email).set(json),
    ]).then(() => {
        response.status(200).send("OK");
    }).catch((error) => {
        logger.error(error);
        response.status(500).send("Internal server error");
    });
});

export const getCSV = onRequest({
    cors: true,
    timeoutSeconds: 60,
    invoker: "public",
    maxInstances: 1,
}, (request, response) => {
    if (request.method !== "GET") { response.status(400).send("Invalid request #01"); return; }

    if (!checkReadKey(String(request.query.key))) { response.status(401).send("Unauthorized"); return; }
    if (request.query.type !== "registrations" && request.query.type !== "checkin") { response.status(400).send("Invalid request #02"); return; }
    if (request.query.of !== "id" && request.query.of !== "email") { response.status(400).send("Invalid request #03"); return; }

    const collectionType = request.query.type === "registrations" ? "registrations" : "checkin";
    const collectionOf = request.query.of === "id" ? "id" : "email";
    const collectionName = collectionType + "_" + collectionOf;
    const registrations = db.collection(collectionName).get().then((snapshot) => {
        const registrations: any[] = [];
        snapshot.forEach((doc) => registrations.push(doc.data()));
        return registrations;
    });

    // find all the headers
    const headers = registrations.then((registrations) => {
        const headers = new Set<string>();
        registrations.forEach((registration) => {
            Object.keys(registration).forEach((key) => {
                headers.add(key);
            });
        });
        const headersArray = Array.from(headers);
        const sortFn = (a: string, b: string) => a.toLowerCase().localeCompare(b.toLowerCase());
        return headersArray.sort(sortFn);
    });

    // generate the CSV
    return Promise.all([registrations, headers]).then(([registrations, headers]) => {
        const csv = [
            headers.join("~"),
            ...registrations.map((registration) => {
                return headers.map((header) => registration[header] ?? "").join("~");
            }),
        ].join("\n");

        response.set("Content-Type", "text/csv");
        response.set("Content-Disposition", "attachment; filename=" + collectionName + ".csv");
        response.status(200).send(csv);
    }).catch((error) => {
        logger.error(error);
        response.status(500).send("Internal server error");
    });
});

export const changeEmail = onRequest({
    cors: true,
    timeoutSeconds: 60,
    cpu: 1,
    invoker: "public",
    maxInstances: 5,
}, (request, response) => {
    if (request.method !== "POST") { response.status(400).send("Invalid request #01"); return; }
    if (request.body === undefined) { response.status(400).send("Invalid request #02"); return; }
    if (request.get("content-type") !== "application/json") { response.status(400).send("Invalid request #03"); return; }
    if (request.body.email === undefined) { response.status(400).send("Invalid request #04"); return; }
    if (request.body.newEmail === undefined) { response.status(400).send("Invalid request #05"); return; }

    const email: string = request.body.email.toLowerCase().trim();
    const newEmail: string = request.body.newEmail.toLowerCase().trim();

    if (!newEmail.endsWith(".edu")) { response.status(400).send("Invalid request #06"); return; }

    return db.collection("registrations_email").doc(email).get().then((doc) => {
        if (!doc.exists) { response.status(404).send("Email not found"); return Promise.reject(); }
        return doc.data()?.id as string;
    }).then(
        id => db.collection("registrations_id").doc(String(id)).get()
    ).then((doc) => {
        if (!doc.exists) { response.status(500).send("Internal server error #03"); return Promise.reject(); }

        const data = doc.data();
        if (data === undefined) { response.status(500).send("Internal server error #04"); return Promise.reject(); }

        data.email = newEmail;
        if (data.originalEmail === undefined) {
            data.originalEmail = [email];
        } else {
            data.originalEmail.push(email);
        }

        return Promise.all([
            db.collection("registrations_id").doc(String(data.id)).set(data, { merge: true }),
            db.collection("registrations_email").doc(email).delete(),
            db.collection("registrations_email").doc(newEmail).set(data),
        ]);
    }).then(() => {
        response.status(200).send("OK");
    }).catch((error) => {
        logger.error(error);
        response.status(500).send("Internal server error #06");
    });
});

export const checkInToEvent = onRequest({
    cors: true,
    timeoutSeconds: 60,
    cpu: 1,
    invoker: "public",
    maxInstances: 5,
}, (request, response) => {
    if (request.method !== "POST") { response.status(400).send("Invalid request #01"); return; }
    if (request.body === undefined) { response.status(400).send("Invalid request #02"); return; }
    if (request.get("content-type") !== "application/json") { response.status(400).send("Invalid request #03"); return; }
    if (request.body.email === undefined) { response.status(400).send("Invalid request #04"); return; }
    if (request.body.event === undefined) { response.status(400).send("Invalid request #05"); return; }

    let email: string = request.body.email.toLowerCase().trim();
    const event: string = request.body.event.trim();
    const responseMessage = {
        email: email,
        event: event,
        icon: "",
        id: "null",
        timestamp: "null",
        alreadyCheckedIn: false,
    };

    const emailPrefix = defineString("EMAIL_PREFIX").value();
    if (!(email.endsWith(".edu") || email.indexOf("+" + emailPrefix + "@") > 0)) {
        response.status(200).send("CHANGE_EMAIL: change your email to a .edu email");
        return;
    }

    email = email.replace("+" + emailPrefix + "@", "@");

    if (event.length === 0) { response.status(400).send("Invalid request #06"); return; }

    return db.collection("extra").doc("icons").get().then((doc) => {
        if (!doc.exists) { response.status(500).send("Internal server error #01"); return Promise.reject(); }
        const data = doc.data();
        if (!data) { response.status(500).send("Internal server error #02"); return Promise.reject(); }
        if (!data[event]) { response.status(400).send("Event not found"); return Promise.reject(); }

        responseMessage.icon = data[event];
        return db.collection("checkin_email").doc(email).get();
    }).then((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (!data) return;
        if (!data[event]) return;

        responseMessage.id = data.id;
        responseMessage.timestamp = data[event];
        responseMessage.alreadyCheckedIn = true;
        response.status(200).send(responseMessage);
        return Promise.reject();
    }).then(
        () => db.collection("registrations_email").doc(email).get()
    ).then((doc) => {
        if (!doc.exists) { response.status(400).send("NOT_REGISTERED: you are not registered"); return Promise.reject(); }

        const registration = doc.data();
        if (registration === undefined) { response.status(500).send("Internal server error #03"); return Promise.reject(); }
        if (registration.id === undefined) { response.status(500).send("Internal server error #04"); return Promise.reject(); }
        return [String(registration.id), String(registration.firstName)];
    }).then((data) => {
        const id = data[0];
        const name = data[1];
        const timestamp = new Date().toISOString();
        const toSet = {
            [event]: timestamp,
            id: id,
            email: email,
            name: name,
        }
        return Promise.all([
            db.collection("checkin_id").doc(id).set(toSet, {merge: true}),
            db.collection("checkin_email").doc(email).set(toSet, {merge: true}),
        ]).then(() => {
            responseMessage.timestamp = timestamp;
            responseMessage.id = id;
            response.status(200).send(responseMessage);
        });
    }).catch(() => {});
});

// export const fillRandomData = onRequest({
//     cors: true,
//     timeoutSeconds: 60,
//     cpu: 1,
//     invoker: "public",
// }, (request, response) => {
//     const db = getFirestore();
//     const promises = [];
//     for (let i = 0; i < 20; i++) {
//         const id = Math.floor(Math.random() * 1000000);
//         const randomName = Math.random().toString(36).substring(2, 15).toUpperCase();
//         let email = id % 2 == 0 ? randomName + "@example.edu" : randomName + "@example.com";
//         email = email.toLowerCase();
//         const timestamp = new Date().toISOString();
//         let json: any = {
//             id,
//             email,
//             timestamp,
//         };
//         json[randomName] = randomName;
//         promises.push(db.collection("registrations_id").doc(id.toString()).set(json));
//         promises.push(db.collection("registrations_email").doc(email).set(json));
//     }
//
//     return Promise.all(promises).then(() => {
//         response.status(200).send("OK");
//     }).catch((error) => {
//         logger.error(error);
//         response.status(500).send("Internal server error");
//     });
// });

export const convertIDToEmail = onRequest({
    cors: true,
    timeoutSeconds: 60,
    invoker: "public",
    maxInstances: 1,
}, (request, response) => {
    if (!checkWriteKey(String(request.query.key))) { response.status(401).send("Unauthorized"); return; }

    //  delete "registrations_email" collection
    const deleteRegistrationsEmail = db.collection("registrations_email").listDocuments().then((documents) => {
        const promises = documents.map((document) => document.delete());
        return Promise.all(promises).then(() => {});
    });

    const registrations = db.collection("registrations_id").get().then((snapshot) => {
        const registrations: any[] = [];
        snapshot.forEach((doc) => registrations.push(doc.data()));
        return registrations;
    });

    return Promise.all([registrations, deleteRegistrationsEmail]).then(([registrations]) => {
        registrations.sort((a, b) => {
            if (!a.EndDate) return -1;
            if (!b.EndDate) return +1;

            const aTimestamp = String(a.EndDate).replace(/-/g, "").replace(/:/g, "").replace(/ /g, "");
            const bTimestamp = String(b.EndDate).replace(/-/g, "").replace(/:/g, "").replace(/ /g, "");
            return Number(aTimestamp) - Number(bTimestamp);
        });

        const emailToRegistration: any = {};
        registrations.forEach((registration) => {
            if (registration.email === undefined) return;
            emailToRegistration[registration.email] = registration;
        });

        const promises = Object.keys(emailToRegistration).map((email) => {
            const registration = emailToRegistration[email];
            registration.email = registration.email.toLowerCase().trim();
            return db.collection("registrations_email").doc(registration.email).set(registration);
        });
        return Promise.all(promises);
    }).then(() => {
        response.status(200).send("OK");
    }).catch((error) => {
        logger.error(error);
        response.status(500).send("Internal server error");
    });
});


export const sendCheckinEmail = onRequest({
    cors: true,
    timeoutSeconds: 60,
    invoker: "public",
    maxInstances: 1,
}, (request, response) => {
    if (!checkWriteKey(String(request.query.key))) { response.status(401).send("Unauthorized"); return; }

    const timestamp = new Date().toISOString();

    return db.collection("checkin_id").get().then((snapshot) => {
        const data: any[] = [];
        snapshot.forEach((doc) => data.push(doc.data()));
        return data;
    }).then((data) => {
        const promises: Promise<any>[] = [];

        const CHECKIN_TAG = defineString("CHECKIN_TAG").value();
        const CHECKIN_EMAIL_LINK = defineString("CHECKIN_EMAIL_LINK").value();
        const CHECKIN_EMAIL_API_NAME = defineString("CHECKIN_EMAIL_API_NAME").value();
        const CHECKIN_EMAIL_API_KEY = defineString("CHECKIN_EMAIL_API_KEY").value();

        data.forEach((registration) => {
            if (!registration[CHECKIN_TAG]) return;
            if (registration["CHECKIN_EMAIL_SENT"]) return;

            const email = registration.email;
            const name = registration.name;

            const emailRequest = fetch(CHECKIN_EMAIL_LINK, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    [CHECKIN_EMAIL_API_NAME]: CHECKIN_EMAIL_API_KEY,
                },
                body: JSON.stringify({
                    email,
                    name,
                }),
            });

            const updateRequestID = db.collection("checkin_id").doc(registration.id).set({
                CHECKIN_EMAIL_SENT: timestamp,
            }, {merge: true});

            const updateRequestEmail = db.collection("checkin_email").doc(email).set({
                CHECKIN_EMAIL_SENT: timestamp,
            }, {merge: true});

            promises.push(emailRequest);
            promises.push(updateRequestID);
            promises.push(updateRequestEmail);
        });

        return Promise.all(promises);
    }).then(() => {
        response.status(200).send("OK");
    }).catch((error) => {
        logger.error(error);
        response.status(500).send("Internal server error");
    });
});