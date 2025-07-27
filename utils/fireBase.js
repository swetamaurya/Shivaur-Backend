const admin = require('firebase-admin');
const dotenv = require("dotenv");
const fs = require('fs');

dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
 

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'fir-project-8d315.appspot.com' // Specify your bucket name
});
const bucket = admin.storage().bucket();

// Function to upload files
const uploadFileToFirebase = async (files) => {
    const fileUrls = [];

    files = Array.isArray(files) ? files : [files];

    try {
        for (const file of files) {
            const docId = Math.floor(Math.random() * 900000000) + 100000000;
            const fileType = file.originalname.split('.').pop();
            const fileRef = bucket.file(`${docId}.${fileType}`);
            const options = {
                metadata: { contentType: file.mimetype },
                resumable: false,
            };

            await new Promise((resolve, reject) => {
                const writable = fileRef.createWriteStream(options);

                writable.on('finish', async () => {
                    try {
                        const [fileUrl] = await fileRef.getSignedUrl({
                            action: 'read',
                            expires: '03-09-2491',
                        });
                        fileUrls.push(fileUrl);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });

                writable.on('error', (error) => {
                    reject(error);
                });

                writable.end(file.buffer);
            });
        }
        return fileUrls;
    } catch (error) {
        throw new Error(`Error uploading files: ${error.message}`);
    }
};

module.exports = { uploadFileToFirebase, bucket };
