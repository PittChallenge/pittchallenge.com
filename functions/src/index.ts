// See a full list of supported triggers at https://firebase.google.com/docs/functions

import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/v2/https";
import {defineString} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

const app = initializeApp();
const db = getFirestore(app);

export const addRegistrationEntry = onRequest({
    cors: true,
    timeoutSeconds: 60,
    cpu: 1,
    invoker: "public",
    maxInstances: 5,
}, (request, response) => {
    if (request.method !== "POST") {
        response.status(400).send("Invalid request");
        return;
    }

    if (request.body === undefined) {
        response.status(400).send("Invalid request body");
        return;
    }

    const contentType = request.get("content-type");
    if (contentType !== "application/json") {
        response.status(400).send("Invalid content type");
        return;
    }

    const writeApiKey = defineString("WRITE_API_KEY");
    if (request.query.key !== writeApiKey.value()) {
        response.status(401).send("Unauthorized");
        return;
    }

    const json = request.body;

    if (json === undefined) {
        response.status(400).send("Invalid request body");
        return;
    }
    if (json.id === undefined) {
        response.status(400).send("Invalid request body");
        return;
    }

    if (json.email === undefined) {
        response.status(400).send("Invalid request body");
        return;
    }

    json.email = json.email.toLowerCase().trim();
    const promises = [
        db.collection("registrations_id").doc(json.id).set(json),
        db.collection("registrations_email").doc(json.email).set(json),
    ];

    Promise.all(promises).then(() => {
        response.status(200).send("OK");
    }).catch((error) => {
        logger.error(error);
        response.status(500).send("Internal server error #01");
    });
});

export const getCSV = onRequest({
    cors: true,
    timeoutSeconds: 60,
    invoker: "public",
    maxInstances: 1,
}, (request, response) => {
    if (request.method !== "GET") {
        response.status(400).send("Invalid request");
        return;
    }

    const readApiKey = defineString("READ_API_KEY");
    if (request.query.key !== readApiKey.value()) {
        response.status(401).send("Unauthorized");
        return;
    }

    if (request.query.type !== "id" && request.query.type !== "email") {
        response.status(400).send("Invalid query parameter");
        return;
    }

    const collectionType = request.query.type === "id" ? "id" : "email";
    const collectionName = "registrations_" + collectionType;
    const registrations = db.collection(collectionName).get().then((snapshot) => {
        const registrations: any[] = [];
        snapshot.forEach((doc) => {
            registrations.push(doc.data());
        });
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
        return headers;
    });

    // generate the CSV
    Promise.all([registrations, headers]).then(([registrations, headers]) => {
        const csv = [
            Array.from(headers).join("~"),
            ...registrations.map((registration) => {
                return Array.from(headers).map((header) => {
                    return registration[header] ?? "";
                }).join("~");
            }),
        ].join("\n");

        response.set("Content-Type", "text/csv");
        response.set("Content-Disposition", "attachment; filename=" + collectionName + ".csv");
        response.status(200).send(csv);
    }).catch((error) => {
        logger.error(error);
        response.status(500).send("Internal server error #02");
    });
});

export const checkInToEvent = onRequest({
    cors: true,
    timeoutSeconds: 60,
    cpu: 1,
    invoker: "public",
    maxInstances: 5,
}, (request, response) => {
    if (request.method !== "POST") { response.status(400).send("Invalid request"); return; }
    if (request.body === undefined) { response.status(400).send("Invalid request body"); return; }
    if (request.get("content-type") !== "application/json") { response.status(400).send("Invalid content type"); return; }
    if (request.body.email === undefined) { response.status(400).send("Invalid request body"); return; }
    if (request.body.event === undefined) { response.status(400).send("Invalid request body"); return; }

    let email: string = request.body.email.toLowerCase().trim();
    const event: string = request.body.event.toLowerCase().trim();
    const responseMessage = {
        email: email,
        event: event,
        id: "null",
        timestamp: "null",
        alreadyCheckedIn: false,
    };

    if (!(email.endsWith(".edu") || email.indexOf("+vedu@") > 0)) {
        response.status(200).send("CHANGE_EMAIL: change your email to a .edu email");
        return;
    }

    email = email.replace("+vedu@", "@");
    if (event.length === 0) { response.status(400).send("INVALID_EVENT: invalid event"); return; }
    if (event === "id") { response.status(400).send("INVALID_EVENT: invalid event"); return; }

    db.collection("checkin_email").doc(email).get().then((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (!data) return;
        if (!data[event]) return;

        responseMessage.id = data.id;
        responseMessage.timestamp = data[event];
        responseMessage.alreadyCheckedIn = true;
        response.status(200).send(responseMessage);
        return true;
    }).then((completed) => {
        if (completed) return;

        return db.collection("registrations_email").doc(email).get().then((doc) => {
            if (!doc.exists) { response.status(200).send("NOT_REGISTERED: you are not registered"); return false; }

            const registration = doc.data();
            if (registration === undefined) { response.status(500).send("Internal server error #03"); return false; }
            if (registration.id === undefined) { response.status(500).send("Internal server error #04"); return false; }
            return String(registration.id);
        }).then((id) => {
            if (!id) return;

            const timestamp = new Date().toISOString();
            const toSet = {
                [event]: timestamp,
                id: id,
            }
            return Promise.all([
                db.collection("checkin_id").doc(id).set(toSet, {merge: true}),
                db.collection("checkin_email").doc(email).set(toSet, {merge: true}),
            ]).then(() => {
                responseMessage.timestamp = timestamp;
                responseMessage.id = id;
                response.status(200).send(responseMessage);
            });
        });
    }).catch((error) => {
        logger.error(error);
        response.status(500).send("Internal server error #05");
    });
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
//     Promise.all(promises).then(() => {
//         response.status(200).send("OK");
//     }).catch((error) => {
//         logger.error(error);
//         response.status(500).send("Internal server error #05");
//     });
// });

// export const convertIDToEmail = onRequest({
//     cors: true,
//     timeoutSeconds: 60,
//     invoker: "public",
//     maxInstances: 1,
// }, (request, response) => {
//     const db = getFirestore();
//
//     //  delete "registrations_email" collection
//     const deleteRegistrationsEmail = db.collection("registrations_email").listDocuments().then((documents) => {
//         const promises = documents.map((document) => {
//             return document.delete();
//         });
//         return Promise.all(promises).then(() => {});
//     });
//
//     const registrations = db.collection("registrations_id").get().then((snapshot) => {
//         const registrations: any[] = [];
//         snapshot.forEach((doc) => {
//             registrations.push(doc.data());
//         });
//         return registrations;
//     });
//
//
//     //  create "registrations_email" collection
//     const createRegistrationsEmail = Promise.all([registrations, deleteRegistrationsEmail]).then(([registrations]) => {
//         const promises = registrations.map((registration) => {
//             registration.email = registration.email.toLowerCase().trim();
//             return db.collection("registrations_email").doc(registration.email).set(registration);
//         });
//         return Promise.all(promises);
//     });
//
//     createRegistrationsEmail.then(() => {
//         response.status(200).send("OK");
//     }).catch((error) => {
//         logger.error(error);
//         response.status(500).send("Internal server error #06");
//     });
// });