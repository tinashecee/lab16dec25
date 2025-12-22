import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "labpartnerswebportal@gmail.com",
    pass: "aafennaorjosxifq",
  },
});

router.post("/approval", async (req, res) => {
  try {
    const { requisitionId, approverEmail, requesterName, department } =
      req.body;

    if (!requisitionId || !approverEmail || !requesterName || !department) {
      return res.status(400).json({
        error: "Missing required fields",
        required: [
          "requisitionId",
          "approverEmail",
          "requesterName",
          "department",
        ],
        received: req.body,
      });
    }

    await transporter.sendMail({
      from: '"Lab Partners Portal" <labpartnerswebportal@gmail.com>',
      to: approverEmail,
      subject: "New Requisition Approval Required",
      html: `
        <h2>New Requisition Requires Your Approval</h2>
        <p>A new requisition (ID: ${requisitionId}) requires your approval.</p>
        <p><strong>Details:</strong></p>
        <ul>
          <li>Requester: ${requesterName}</li>
          <li>Department: ${department}</li>
        </ul>
        <p>Please login to the system to review and approve/reject this request.</p>
      `,
    });

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      error: "Failed to send email",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/rejection", async (req, res) => {
  try {
    const { requisitionId, requesterEmail, rejectorName, reason, stage } = req.body;

    if (!requisitionId || !requesterEmail || !rejectorName || !reason || !stage) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["requisitionId", "requesterEmail", "rejectorName", "reason", "stage"],
        received: req.body,
      });
    }

    await transporter.sendMail({
      from: '"Lab Partners Portal" <labpartnerswebportal@gmail.com>',
      to: requesterEmail,
      subject: "Inventory Request Rejected",
      html: `
        <h2>Your Inventory Request Has Been Rejected</h2>
        <p>Your inventory request (ID: ${requisitionId}) has been rejected.</p>
        <p><strong>Details:</strong></p>
        <ul>
          <li>Rejected by: ${rejectorName}</li>
          <li>Stage: ${stage}</li>
          <li>Reason: ${reason}</li>
        </ul>
        <p>Please login to the system to view the full details and submit a new request if needed.</p>
      `,
    });

    res.status(200).json({ message: "Rejection email sent successfully" });
  } catch (error) {
    console.error("Error sending rejection email:", error);
    res.status(500).json({
      error: "Failed to send rejection email",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/issuance", async (req, res) => {
  try {
    const { requisitionId, requesterEmail, requesterName, issuedProducts, notes } = req.body;

    if (!requisitionId || !requesterEmail || !requesterName || !issuedProducts) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["requisitionId", "requesterEmail", "requesterName", "issuedProducts"],
        received: req.body,
      });
    }

    // Generate products table HTML
    const productsTable = issuedProducts.map((product: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td>${product.name}</td>
        <td>${product.issuedQuantity}</td>
        <td>${product.unit}</td>
      </tr>
    `).join('');

    await transporter.sendMail({
      from: '"Lab Partners Portal" <labpartnerswebportal@gmail.com>',
      to: requesterEmail,
      subject: "Inventory Request Issued",
      html: `
        <h2>Your Inventory Request Has Been Issued</h2>
        <p>Dear ${requesterName},</p>
        <p>Your inventory request (ID: ${requisitionId}) has been processed and the items have been issued.</p>
        
        <h3>Issued Items:</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th>No.</th>
              <th>Product</th>
              <th>Quantity Issued</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            ${productsTable}
          </tbody>
        </table>
        
        ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
        
        <p>Please login to the system to view the full details and confirm receipt.</p>
      `,
    });

    res.status(200).json({ message: "Issuance email sent successfully" });
  } catch (error) {
    console.error("Error sending issuance email:", error);
    res.status(500).json({
      error: "Failed to send issuance email",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/task-assignment", async (req, res) => {
  try {
    const { taskId, assignedToEmail, assignedToName, assignedByName, taskTitle, taskDescription, dueDate, priority } = req.body;

    if (!taskId || !assignedToEmail || !assignedToName || !assignedByName || !taskTitle || !dueDate) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["taskId", "assignedToEmail", "assignedToName", "assignedByName", "taskTitle", "dueDate"],
        received: req.body,
      });
    }

    const formattedDate = new Date(dueDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    await transporter.sendMail({
      from: '"Lab Partners Portal" <labpartnerswebportal@gmail.com>',
      to: assignedToEmail,
      subject: `New Task Assigned: ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://labpartners.co.zw/wp-content/uploads/2022/09/logo-small.png" alt="Lab Partners" style="max-width: 150px;" />
          </div>
          
          <h2 style="color: #333; border-bottom: 2px solid #fc505a; padding-bottom: 10px;">
            New Task Assigned
          </h2>
          
          <p>Dear <strong>${assignedToName}</strong>,</p>
          
          <p>A new task has been assigned to you by <strong>${assignedByName}</strong>.</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Task Details</h3>
            <p><strong>Task ID:</strong> ${taskId}</p>
            <p><strong>Title:</strong> ${taskTitle}</p>
            ${taskDescription ? `<p><strong>Description:</strong> ${taskDescription}</p>` : ''}
            <p><strong>Priority:</strong> <span style="color: ${priority === 'High' || priority === 'Urgent' ? '#fc505a' : '#333'};">${priority || 'Normal'}</span></p>
            <p><strong>Due Date:</strong> ${formattedDate}</p>
            <p><strong>Assigned By:</strong> ${assignedByName}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.labpartners.co.zw/app/tasks?taskId=${taskId}" 
               style="background-color: #fc505a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Task
            </a>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Please login to the system to view the full task details and start working on it.
          </p>
        </div>
      `,
    });

    res.status(200).json({ message: "Task assignment email sent successfully" });
  } catch (error) {
    console.error("Error sending task assignment email:", error);
    res.status(500).json({
      error: "Failed to send task assignment email",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

router.post("/task-completion", async (req, res) => {
  try {
    const { taskId, assignerEmail, assignerName, completedByName, taskTitle, completedAt } = req.body;

    if (!taskId || !assignerEmail || !assignerName || !completedByName || !taskTitle) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["taskId", "assignerEmail", "assignerName", "completedByName", "taskTitle"],
        received: req.body,
      });
    }

    const formattedDate = completedAt 
      ? new Date(completedAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });

    await transporter.sendMail({
      from: '"Lab Partners Portal" <labpartnerswebportal@gmail.com>',
      to: assignerEmail,
      subject: `Task Completed: ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://labpartners.co.zw/wp-content/uploads/2022/09/logo-small.png" alt="Lab Partners" style="max-width: 150px;" />
          </div>
          
          <h2 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
            ✓ Task Completed
          </h2>
          
          <p>Dear <strong>${assignerName}</strong>,</p>
          
          <p>Great news! A task you assigned has been completed.</p>
          
          <div style="background-color: #f0f9f0; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #333;">Task Details</h3>
            <p><strong>Task ID:</strong> ${taskId}</p>
            <p><strong>Title:</strong> ${taskTitle}</p>
            <p><strong>Completed By:</strong> ${completedByName}</p>
            <p><strong>Completed At:</strong> ${formattedDate}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.labpartners.co.zw/app/tasks?taskId=${taskId}" 
               style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Task
            </a>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Please login to the system to review the completed task and provide any feedback if needed.
          </p>
        </div>
      `,
    });

    res.status(200).json({ message: "Task completion email sent successfully" });
  } catch (error) {
    console.error("Error sending task completion email:", error);
    res.status(500).json({
      error: "Failed to send task completion email",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
