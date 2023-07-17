// See a full list of supported triggers at https://firebase.google.com/docs/functions

import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/v2/https";
import {defineString} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

initializeApp();

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
    const db = getFirestore();
    const promises = [
        db.collection("registrations_id").doc(json.id).set(json),
        db.collection("registrations_email").doc(json.email).set(json),
    ];

    Promise.all(promises).then(() => {
        response.status(200).send("OK");
    }).catch((error) => {
        logger.error(error);
        response.status(500).send("Internal server error");
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
//         const email = randomName + "@example.com";
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
//         response.status(500).send("Internal server error");
//     });
// });

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
    const db = getFirestore();
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
            Array.from(headers).join(","),
            ...registrations.map((registration) => {
                return Array.from(headers).map((header) => {
                    return registration[header] ?? "";
                }).join(",");
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
//         response.status(500).send("Internal server error");
//     });
// });