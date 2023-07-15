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

    const db = getFirestore();
    db.collection("registrations").doc(json.id).set(json).then(() => {
        logger.info("Registration saved");
        response.status(200).send("OK");
    }).catch((error) => {
        logger.error(error);
        response.status(500).send("Internal server error");
    });
});
