import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";
import admin from "firebase-admin";
import path from "path";
import { twilioService } from "./services/twilioService.js";
import SENDLEAVEAPPMAIL from "../email-generators/leave-app-submitted.cjs";
import SENDLEAVEAPPRESEMAIL from "../email-generators/leave-app-response.cjs";
import SENDLOANAPPMAIL from "../email-generators/loan-application.cjs";
import SENDLOANAPPRESEMAIL from "../email-generators/loan-response.cjs";
import SENDHANDOVERMAIL from "../email-generators/task-handover.cjs";
import SENDANNOUNCEMENTSMAIL from "../email-generators/announcements.cjs";
import SENDBUSINESSMANUALADDEDMAIL from "../email-generators/business-manual-added.cjs";
import SENDBUSINESSMANUALUPDATEDMAIL from "../email-generators/business-manual-updated.cjs";
import emailRoutes from "./routes/email.js";
import multer from "multer";
import qs from "qs"; // Install qs if not already installed: npm install qs
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  getFirestore,
  getDoc,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { markOverdueTests } from "./services/tatOverdueCheck.js";
import cron from "node-cron";

// Environment validation
const requiredEnvVars = ['NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.warn(`Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
}

console.log(`🚀 Server starting in ${process.env.NODE_ENV || 'development'} mode`);

const app = express();

// Enable CORS for your frontend URL
app.use(
  cors({
    origin: [
    'http://localhost:5173', // Vite dev server
    'https://app.labpartners.co.zw' // Your production domain
  ], // Your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json());

// Serve static files from the dist directory in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
}

// Email routes
app.use("/api/email", emailRoutes);

const firebaseConfig = {
  apiKey: "AIzaSyB1JjX58sjyYC5D69h_k2ylyxcQ99G932w",
  authDomain: "labpartners-bc8e7.firebaseapp.com",
  databaseURL: "https://labpartners-bc8e7-default-rtdb.firebaseio.com",
  projectId: "labpartners-bc8e7",
  storageBucket: "labpartners-bc8e7.firebasestorage.app",
  messagingSenderId: "51482194133",
  appId: "1:51482194133:web:0076360816446a7064b25c",
};
const ap = initializeApp(firebaseConfig);
// Initialize services
export const db = getFirestore(ap);

// Use absolute path for service account key
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(process.cwd(), "..", "labpartners-bc8e7-firebase-adminsdk-g2bba-3de175affb.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
  databaseURL: "https://labpartners-bc8e7-default-rtdb.firebaseio.com",
  storageBucket: "lab-partners-app-4bcde.appspot.com",
});

// Multer setup to handle FormData
const upload = multer();

app.post("/send-notification", async (req, res) => {
  const { token, message } = req.body;

  const payload = {
    notification: {
      title: message.title,
      body: message.body,
    },
    data: {
      sample_id: String(message.sample_id || ""), // Ensure string
      requested_at: String(message.requestedAt || ""),
      caller_name: String(message.caller_name || ""),
      caller_number: String(message.caller_number || ""),
      lat: String(message.lat || ""),
      lng: String(message.lng || ""),
      message: String(message.message || ""),
      notification_type: String(message.notification_type || ""),
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(payload);
    res.status(200).send({ success: true, response });
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

app.post("/send-leave-req-email", async (req, res) => {
  try {
    const { a, b, c, d, e, f, g, h, emails } = req.body;

    const responses = await Promise.all(
      emails.map(email => SENDLEAVEAPPMAIL(a, b, c, d, e, f, g, h, email))
    );

    res.status(200).send({ success: true, responses });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});
app.post("/send-leave-res-email", async (req, res) => {
  const { a, b, c, d, e, f, g, h, i, j } = req.body;

  try {
    const response = await SENDLEAVEAPPRESEMAIL(a, b, c, d, e, f, g, h, i, j);
    res.status(200).send({ success: true, response });
  } catch (error) {
    res.status(500).send(error);
  }
});
app.post("/send-loan-req-email", async (req, res) => {
  try {
    const { a, b, c, d, e, f, g, h } = req.body; // assuming `h` is a list of emails

    const responses = await Promise.all(
      h.map((email) => SENDLOANAPPMAIL(a, b, c, d, e, f, g, email))
    );

    res.status(200).send({ success: true, responses });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

app.post("/send-loan-res-email", async (req, res) => {
  const { a, b, c, d, e, f, g, h, i } = req.body;

  try {
    const response = await SENDLOANAPPRESEMAIL(a, b, c, d, e, f, g, h, i);
    res.status(200).send({ success: true, response });
  } catch (error) {
    res.status(500).send(error);
  }
});

// Task handover / assignment email
// a: handover_id, b: assigned_by, c: date, d: task_name, e: task_desc, f: assigned_to, g: due_date, h: email
app.post("/send-task-handover-email", async (req, res) => {
  const { a, b, c, d, e, f, g, h } = req.body;
  try {
    const response = await SENDHANDOVERMAIL(a, b, c, d, e, f, g, h);
    res.status(200).send({ success: true, response });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// Announcement email (with attachment)
// a: userName, b: date, c: department, d: notes, e: file_url, f: email
app.post("/send-announcement-email", async (req, res) => {
  const { a, b, c, d, e, f } = req.body;
  try {
    const response = await SENDANNOUNCEMENTSMAIL(a, b, c, d, e, f);
    res.status(200).send({ success: true, response });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// Business manual added email
// a: userName, b: dateAdded, c: effectiveDate, d: version, e: department, f: notes, g: lastUpdated, h: file_url, i: email
app.post("/send-business-manual-added-email", async (req, res) => {
  const { a, b, c, d, e, f, g, h, i } = req.body;
  try {
    const response = await SENDBUSINESSMANUALADDEDMAIL(a, b, c, d, e, f, g, h, i);
    res.status(200).send({ success: true, response });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// Business manual updated email
// a: userName, b: dateAdded, c: effectiveDate, d: version, e: department, f: notes, g: lastUpdated, h: file_url, i: email
app.post("/send-business-manual-updated-email", async (req, res) => {
  const { a, b, c, d, e, f, g, h, i } = req.body;
  try {
    const response = await SENDBUSINESSMANUALUPDATEDMAIL(a, b, c, d, e, f, g, h, i);
    res.status(200).send({ success: true, response });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});
////
app.post("/sample-received", async (req, res) => {
  const payload = req.body;

  const {
    sampleId,
    Status, // Fix: Ensure field name matches Postman JSON
    accessionDate,
    orderNumber,
    labUserId,
    labId,
    billId,
    dictionaryId,
    labPatientId,
    testID,
    CentreReportId,
    labReportId,
    integrationCode,
  } = payload;

  if (Status === "Sample Received") {
    console.log("sample received with payload below:");
console.log(payload);
    const sampleData = {
      sampleId,
      Status,
      accessionDate,
      orderNumber,
      labUserId,
      labId,
      billId,
      dictionaryId,
      labPatientId,
      testID,
      CentreReportId,
      labReportId,
      integrationCode,
    };

    // Remove undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(sampleData).filter(([_, value]) => value !== undefined)
    );

    try {
      // 🔹 Query from "collectedSamples" (fix incorrect collection name)
      const collectedSamplesRef = collection(db, "collectionRequests");
      const q = query(
        collectedSamplesRef,
        where("accession_number", "==", sampleId),
        where("status", "==", "registered")
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        for (const document of querySnapshot.docs) {
          const docRef = doc(db, "collectionRequests", document.id); // Ensure updating the correct collection
          console.log("Updating document:", document.id); // Log document ID
          const now = new Date();
          await updateDoc(docRef, {
            status: "received",
            received_at: now,
            ...cleanedData,
          });

          // 🔹 TAT Tracking Logic START
          // testID and dictionaryId may be arrays or single values
          const testIDs = Array.isArray(testID) ? testID : [testID];
          const dictionaryIDs = Array.isArray(dictionaryId) ? dictionaryId : [dictionaryId];

          for (let i = 0; i < testIDs.length; i++) {
            const tID = testIDs[i];
            const dID = dictionaryIDs[i];

            // Fetch TAT info from tests collection
            const testDocSnap = await getDoc(doc(db, "tests", tID.toString()));
            if (!testDocSnap.exists()) {
              console.warn(`Test document not found for testID: ${tID}`);
              continue;
            }
            
            const testData = testDocSnap.data();
            const priority = testData.priority || "normal"; // Default to "normal" if undefined
            const targetTATMinutes = testData.targetTATMinutes || 1440; // Default to 24 hours if undefined

            // Write to TAT tracking collection
            await setDoc(doc(db, "testTATTracking", `${sampleId}_${tID}`), {
              sampleId,
              orderNumber,
              testID: tID,
              dictionaryId: dID,
              accessionDate,
              priority,
              targetTATMinutes,
              status: "processing",
              completionDate: null,
              actualTATMinutes: null,
            });
          }
          // 🔹 TAT Tracking Logic END
        }
        console.log("Sample changed to received");
      } else {
        console.log("No matching document found.");
      }
    } catch (error) {
      console.error("Error updating document:", error);
      return res.status(500).send("Error updating document.");
    }
  }
  res.status(200).send("Webhook received");
});

// Function to delete sample from 'received_samples'
async function deleteSample(sampleId) {
  const db = admin.database();
  const sampleRef = doc(db, "received_samples/" + sampleId);

  // Validate sampleId before proceeding
  if (!sampleId || typeof sampleId !== "string") {
    console.error("Invalid sampleId:", sampleId);
    return;
  }

  try {
    await remove(sampleRef);
    console.log(`Sample ${sampleId} successfully deleted.`);
  } catch (error) {
    console.error("Error deleting sample:", error);
  }
}

app.post("/individual-sample-completed", async (req, res) => {
  console.log("individual-sample-completed");
  const payload = req.body;
  let yourDate = new Date();
  const date_created = yourDate.toISOString(); // Format timestamp correctly

  try {
    // Extract data from payload
    const {
      labId,
      countryCodeOfPatient,
      "Patient Name": patientName,
      "Submitted Username": submittedUsername,
      smart_report_links,
      labPatientId,
      "Test Name": testName,
      isSigned,
      billReferral,
      "Billed Username": billedUsername,
      "Submitted UserId": submittedUserId,
      lab_bill_id: billId,
      report_id: labReportId,
      action_category_id: actionCategoryId,
      is_sent_to_mirth: isSentToMirth,
      lab_integration_id: integrationId,
      patient_id: patientId,
      "Report Date": reportDate,
      status,
      testCode,
      userDetailsId,
      Gender,
      Age,
      labName,
      "Accession Date": accessionDate,
      labCity,
      billPaymentStatus,
      "Referral Address": referralAddress,
      "Patient Id": patientAltId,
      "Referral Contact": referralContact,
      "Referral comments": referralComments,
      reportDate: sampleReportDate,
      sampleID,
      labReportId: finalLabReportId,
      "Org Code": orgCode,
      countryCodeOfDoctor,
      "Sample Date": sampleDate,
      billId: finalBillId,
      dictionaryId,
      "Patient Alternate Contact": patientAltContact,
      labUserName,
      "Report Id": reportFinalId,
      "Billed UserId": billedUserId,
      "Referral Type": referralType,
      integration_payload: {
        "Approval Date": approvalDate,
        billPaymentMode,
        testID,
        "Referral RegNo": referralRegNo,
        lab_user_id: labUserId,
        "Referral Email": referralEmail,
      },
    } = payload;

    // Create Firestore document object
    const sampleData = {
      labId,
      countryCodeOfPatient,
      patientName,
      submittedUsername,
      smart_report_links,
      labPatientId,
      testName,
      isSigned,
      billReferral,
      billedUsername,
      submittedUserId,
      billId,
      labReportId,
      actionCategoryId,
      isSentToMirth,
      integrationId,
      patientId,
      reportDate,
      status,
      testCode,
      userDetailsId,
      Gender,
      Age,
      labName,
      accessionDate,
      labCity,
      billPaymentStatus,
      referralAddress,
      patientAltId,
      referralContact,
      referralComments,
      sampleReportDate,
      sampleID,
      finalLabReportId,
      orgCode,
      countryCodeOfDoctor,
      sampleDate,
      finalBillId,
      dictionaryId,
      patientAltContact,
      labUserName,
      reportFinalId,
      billedUserId,
      referralType,
      approvalDate,
      billPaymentMode,
      testID,
      referralRegNo,
      labUserId,
      referralEmail,
      date_created,
    };

    // Filter out undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(sampleData).filter(([key, value]) => value !== undefined)
    );

    // 1. Save to individual_completed_samples collection
    await setDoc(
      doc(collection(db, "individual_completed_samples"), sampleID),
      cleanedData
    );

    // 2. Update the original sample document
    const sampleRef = doc(db, "collectionRequests", sampleID);
    const sampleDoc = await getDoc(sampleRef);

    if (sampleDoc.exists()) {
      const sampleData = sampleDoc.data();
      const updatedTests = sampleData.tests.map((test) =>
        test.id === testID
          ? { ...test, status: "completed", completedAt: date_created }
          : test
      );

      const allTestsCompleted = updatedTests.every(
        (test) => test.status === "completed"
      );

      await updateDoc(sampleRef, {
        tests: updatedTests,
        ...(allTestsCompleted && {
          status: "completed",
          completed_at: date_created,
        }),
      });

      // 🔹 TAT Update Logic START
      try {
        // testID and dictionaryId may be arrays or single values
        const testIDs = Array.isArray(testID) ? testID : [testID];
        const dictionaryIDs = Array.isArray(dictionaryId) ? dictionaryId : [dictionaryId];
        const reportDate = date_created; // Use the webhook's completion timestamp

        for (let i = 0; i < testIDs.length; i++) {
          const tID = testIDs[i];
          const dID = dictionaryIDs[i];
          
          if (!tID) {
            console.warn(`Skipping TAT update for undefined testID at index ${i}`);
            continue;
          }
          
          const tatDocRef = doc(db, "testTATTracking", `${sampleID}_${tID}`);
          const tatDocSnap = await getDoc(tatDocRef);
          
          if (!tatDocSnap.exists()) {
            console.warn(`TAT tracking document not found for ${sampleID}_${tID}`);
            continue;
          }
          
          const tatData = tatDocSnap.data();
          const accessionDate = tatData.accessionDate;
          const targetTATMinutes = tatData.targetTATMinutes || 1440; // Default 24 hours
          
          if (!accessionDate) {
            console.warn(`No accession date found for TAT document ${sampleID}_${tID}`);
            continue;
          }
          
          const actualTATMinutes = (new Date(reportDate) - new Date(accessionDate)) / 60000;
          const status = actualTATMinutes > targetTATMinutes ? "overdue" : "completed";
          
          await updateDoc(tatDocRef, {
            completionDate: reportDate,
            actualTATMinutes,
            status,
          });
          
          console.log(`TAT updated for ${sampleID}_${tID}: ${status} (${Math.round(actualTATMinutes)} minutes)`);
        }
      } catch (tatError) {
        console.error("Error updating TAT tracking:", tatError);
        // Don't throw - continue with the rest of the webhook processing
      }
      // 🔹 TAT Update Logic END

      // 3. Notify driver if all tests are completed
      if (allTestsCompleted && sampleData.assigned_driver?.messageToken) {
        const message = {
          title: `Sample Completed`,
          body: `All tests completed for sample ${sampleID}`,
          sample_id: sampleID,
          notification_type: "completion",
        };

        await fetch("http://localhost:3001/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: sampleData.assigned_driver.messageToken,
            message: message,
          }),
        });
      }
    }

    console.log(`✅ Sample ${sampleID} processed. Test ${testID || 'unknown'} (${testName || 'unknown test name'}) completed.`);
    res.status(200).send("Webhook processed successfully");
  } catch (error) {
    console.error("❌ Error saving to Firestore:", error);
    res.status(500).send("Error processing request.");
  }
});

app.post("/consolidated-sample-completed", async (req, res) => {
  console.log("✅ consolidated-sample-completed Webhook Received");

  const payload = req.body;
  let yourDate = new Date();
  const date_created = yourDate.toISOString(); // Correct timestamp format

  try {
    // Extract data from payload
    const {
      "Billed Username": billedUsername,
      OrganizationName,
      "Patient Name": patientName,
      "Referral Contact": referralContact,
      smart_report_links,
      CentreReportId,
      isBillDue,
      billDate,
      "Patient Designation": patientDesignation,
      OrganizationID,
      labId,
      countryCodeOfDoctor,
      sampleID,
      billId,
      ReferralID,
      billPaymentStatus,
      "Billed UserId": billedUserId,
      "Referral Type": referralType,
      Age,
      testName,
      status,
      testCode,
      userDetailsId,
      Gender,
      ReferralName,
      labName,
      "Referral Address": referralAddress,
      webhookId,
      "Patient Id": patientId,
      IntegrationCodes,
      "Contact No": contactNo,
      billPaymentMode,
      testID,
      reportURL,
      "Referral RegNo": referralRegNo,
      "Referral Email": referralEmail,
    } = payload;

    // Create Firestore document object
    const sampleData = {
      billedUsername,
      OrganizationName,
      patientName,
      referralContact,
      smart_report_links,
      CentreReportId,
      isBillDue,
      billDate,
      patientDesignation,
      OrganizationID,
      labId,
      countryCodeOfDoctor,
      sampleID,
      billId,
      ReferralID,
      billPaymentStatus,
      billedUserId,
      referralType,
      Age,
      testName,
      status,
      testCode,
      userDetailsId,
      Gender,
      ReferralName,
      labName,
      referralAddress,
      webhookId,
      patientId,
      IntegrationCodes,
      contactNo,
      billPaymentMode,
      testID,
      reportURL,
      referralRegNo,
      referralEmail,
      date_created,
    };

    // Filter out undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(sampleData).filter(([key, value]) => value !== undefined)
    );

    try {
      // 🔹 Query from "collectedSamples" (fix incorrect collection name)
      console.log("sampleID", sampleID[0]);
      const collectedSamplesRef = collection(db, "collectionRequests");
      const q = query(
        collectedSamplesRef,
        where("accession_number", "==", sampleID[0]),
        where("status", "==", "received")
      );

      const querySnapshot = await getDocs(q);
      let assignedDriverToken;
      let message;
      if (!querySnapshot.empty) {
        for (const document of querySnapshot.docs) {
          const docData = document.data(); // Get Firestore document data
          const docRef = doc(db, "collectionRequests", document.id); // Ensure updating the correct collection
          console.log("Updating document:", document.id); // Log document ID
          const now = new Date();
          await updateDoc(docRef, {
            completed_at: now,
            status: "Consolidated All Report Submit",
            ...cleanedData,
          });
          assignedDriverToken = docData?.assigned_driver?.messageToken;
          message = {
            title: `Sample Delivery`,
            body: `Location: ${docData.center_name}`,
            sample_id: docData.sample_id,
            requestedAt: docData.completed_at,
            caller_name: `${docData.caller_name} ${docData.center_name}`,
            caller_number: docData.caller_number,
            lat: String(docData.center_coordinates["lat"]),
            lng: String(docData.center_coordinates["lng"]),
            message: docData.notes,
            notification_type: "delivery",
          };
        }

        if (assignedDriverToken) {
          // Send push notification
          const response = await fetch(
            "https://app.labpartners.co.zw/send-notification",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                token: assignedDriverToken,
                message: message,
              }),
            }
          );

          console.log("Notification sent, response:", await response.json());
        } else {
          console.log("No messageToken found for the assigned driver.");
        }

        console.log("Consolidated All Report Submit");
      } else {
        console.log("No matching document found.");
        return res.status(200).send("No matching Document.");
      }
    } catch (error) {
      console.error("Error updating document:", error);
      return res.status(500).send("Error updating document.");
    }
  } catch (error) {
    console.error("❌ Error saving to Firestore:", error);
    res.status(500).send("Error processing request.");
  }
  return res
    .status(200)
    .send("Webhook Consolidated All Report Submit successfully.");
});
// WhatsApp Notification Endpoint
app.post("/send-whatsapp-notification", async (req, res) => {
  const { phoneNumber, message } = req.body;

  try {
    const messageId = await twilioService.sendWhatsAppMessage(
      phoneNumber,
      message
    );
    res.status(200).json({ success: true, messageId });
  } catch (error) {
    console.error("WhatsApp notification error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Schedule the TAT overdue check to run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  try {
    await markOverdueTests();
  } catch (err) {
    console.error("Error running periodic TAT overdue check:", err);
  }
});

// Serve React app for all non-API routes (for client-side routing)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT,'0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Serving static files from: ${path.join(process.cwd(), 'dist')}`);
  }
});
