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

    const currentDate = new Date().toLocaleDateString();
    const userName = approverEmail.split('@')[0]; // Extract name from email

    await transporter.sendMail({
      from: '"Lab Partners Portal" <labpartnerswebportal@gmail.com>',
      to: approverEmail,
      subject: "New Inventory Request Requires Your Approval",
      html: `
        <style type="text/css">
        body *{font-family: 'Open Sans', Arial, sans-serif }
        div, p, a, li, td { -webkit-text-size-adjust:none; }
        *{-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;}
        td{word-break: break-word;}
        a{word-break: break-word; text-decoration: none; color: inherit;}
        body td img:hover {opacity:0.85;filter:alpha(opacity=85);}
        body .ReadMsgBody{width: 100%; background-color: #ffffff;}
        body .ExternalClass{width: 100%; background-color: #ffffff;}
        body{width: 100%; height: 100%; background-color: #ffffff; margin:0; padding:0; -webkit-font-smoothing: antialiased;}
        html{ background-color:#ffffff; width: 100%;}
        body p {padding: 0!important; margin-top: 0!important; margin-right: 0!important; margin-bottom: 0!important; margin-left: 0!important; }
        body img {user-drag: none; -moz-user-select: none; -webkit-user-drag: none;}
        body .hover:hover {opacity:0.85;filter:alpha(opacity=85);}
        body .fullImage img {width: 600px;height: auto;text-align: center;} 
        body .img184 img{width:184px; height: auto;}
        body .buttonScale {float: none!important; text-align: center!important; display: inline-block!important; margin: 0px!important; clear: both;}
        body .fullBorderRadius {-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px;}
        </style>
        
        <body style='margin: 0; padding: 0;'>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" bgcolor="rgb(6, 3, 3)" style="background-color: rgb(6, 3, 3);">
          <tbody><tr>
            <td width="100%" valign="top">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody><tr>
                  <td>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
                      <tbody><tr>
                        <td width="100%" height="50"></td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>
        
        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
          <tbody><tr>
            <td width="100%" valign="top" bgcolor="#f3f3f3"> 
              <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody><tr>
                  <td>
                    <table width="600" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
                      <tbody><tr>
                        <td width="100%">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="full">
                            <tbody><tr>
                              <td width="100%" height="70"></td>
                            </tr>
                          </tbody></table>

                          <table width="184" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="fullCenter">
                            <tbody><tr>
                              <td width="100%" class="img184">
                                <a href="#" style="text-decoration: none;">
                                  <img src="https://labpartners.co.zw/wp-content/uploads/2022/09/logo-small.png" editable="true" width="184" height="auto" style="width: 184px;" alt="" border="0" class="hover toModifyImage">
                                </a>
                              </td>
                            </tr>
                          </tbody></table>

                          <table width="1" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="full">
                            <tbody><tr>
                              <td width="100%" height="40"></td>
                            </tr>
                          </tbody></table>
                          
                          <table width="375" border="0" cellpadding="0" cellspacing="0" align="right" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="fullCenter">
                            <tbody><tr>
                              <td width="100%" style="font-size: 26px; color: #4e4e4e; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; line-height: 32px; vertical-align: top; font-weight: 600;">
                                New Inventory Request
                              </td>
                            </tr>
                            <tr>
                              <td width="100%" height="25"></td>
                            </tr>
                            <tr>
                              <td width="100%" style="font-size: 14px; color: #8d9499; text-align: left; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; line-height: 26px; vertical-align: top; font-weight: 400;" class="fullCenter">
                                <strong><span style="color: rgb(0, 0, 0);">Dear ${userName}</span></strong><br><br><br>
                                <span style="color: rgb(0, 0, 0);">A new inventory request has been submitted for your approval, kindly login and review the request.</span><br><br>
                                <strong>Request Details:</strong><br>
                                <strong><span style="color: rgb(0, 0, 0);">Request ID:</span></strong> ${requisitionId}<br>
                                <strong><span style="color: rgb(0, 0, 0);">Date Submitted:</span></strong> ${currentDate}<br>
                                <strong><span style="color: rgb(0, 0, 0);">Department:</span></strong> ${department}<br>
                                <strong><span style="color: rgb(0, 0, 0);">Requested By:</span></strong> ${requesterName}<br>
                              </td>
                            </tr>
                            <tr><td width="100%" height="45"></td></tr>
                            <tr>
                              <td width="100%" class="buttonScale" align="left">
                                <span class="featuredHolder">
                                  <table border="0" cellpadding="0" cellspacing="0" align="left" class="buttonScale">
                                    <tbody><tr>
                                      <td width="100%" align="center" height="38" bgcolor="#fc505a" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; padding-left: 25px; padding-right: 25px; font-weight: 600; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; color: #ffffff; font-size: 13px;">
                                        <multiline><a href="https://app.labpartners.co.zw/requisition-approvals" style="color: #ffffff; font-size: 13px; text-decoration: none; line-height: 13px; width: 100%;">Review Request</a></multiline>
                                      </td>
                                    </tr>
                                  </tbody></table>
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td width="100%" height="18"></td>
                            </tr>
                          </tbody></table>
                        </td>
                      </tr>
                    </tbody></table>

                    <table width="100%" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="full">
                      <tbody><tr>
                        <td width="100%" height="70"></td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" bgcolor="#23282b" style="background-color: rgb(35, 40, 43);">
          <tbody><tr>
            <td width="100%" valign="top"> 
              <table width="600" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody><tr>
                  <td width="100%">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" align="left" style="text-align: center;" class="fullCenter">
                      <tbody><tr>
                        <td width="100%" height="25"></td>
                      </tr>
                      <tr>
                        <td width="100%" style="text-align: center; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; font-size: 13px; color: #8d9499; font-weight: 400;" class="fullCenter">
                          <span style="color: #ffffff;">© 2024 All rights Reserved - Powered by <strong><a href="https://soxfort.com" style="color: #ffffff;">Soxfort Solutions</a></strong> | Intuitive Innovation</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="100%" height="24"></td>
                      </tr>
                      <tr>
                        <td width="100%" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>
        </body>
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

    const currentDate = new Date().toLocaleDateString();
    const userName = requesterEmail.split('@')[0]; // Extract name from email

    await transporter.sendMail({
      from: '"Lab Partners Portal" <labpartnerswebportal@gmail.com>',
      to: requesterEmail,
      subject: "Inventory Request Rejected",
      html: `
        <style type="text/css">
        body *{font-family: 'Open Sans', Arial, sans-serif }
        div, p, a, li, td { -webkit-text-size-adjust:none; }
        *{-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;}
        td{word-break: break-word;}
        a{word-break: break-word; text-decoration: none; color: inherit;}
        body td img:hover {opacity:0.85;filter:alpha(opacity=85);}
        body .ReadMsgBody{width: 100%; background-color: #ffffff;}
        body .ExternalClass{width: 100%; background-color: #ffffff;}
        body{width: 100%; height: 100%; background-color: #ffffff; margin:0; padding:0; -webkit-font-smoothing: antialiased;}
        html{ background-color:#ffffff; width: 100%;}
        body p {padding: 0!important; margin-top: 0!important; margin-right: 0!important; margin-bottom: 0!important; margin-left: 0!important; }
        body img {user-drag: none; -moz-user-select: none; -webkit-user-drag: none;}
        body .hover:hover {opacity:0.85;filter:alpha(opacity=85);}
        body .fullImage img {width: 600px;height: auto;text-align: center;} 
        body .img184 img{width:184px; height: auto;}
        body .buttonScale {float: none!important; text-align: center!important; display: inline-block!important; margin: 0px!important; clear: both;}
        body .fullBorderRadius {-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px;}
        </style>
        
        <body style='margin: 0; padding: 0;'>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" bgcolor="rgb(6, 3, 3)" style="background-color: rgb(6, 3, 3);">
          <tbody><tr>
            <td width="100%" valign="top">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody><tr>
                  <td>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
                      <tbody><tr>
                        <td width="100%" height="50"></td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>
        
        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
          <tbody><tr>
            <td width="100%" valign="top" bgcolor="#f3f3f3"> 
              <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody><tr>
                  <td>
                    <table width="600" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
                      <tbody><tr>
                        <td width="100%">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="full">
                            <tbody><tr>
                              <td width="100%" height="70"></td>
                            </tr>
                          </tbody></table>

                          <table width="184" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="fullCenter">
                            <tbody><tr>
                              <td width="100%" class="img184">
                                <a href="#" style="text-decoration: none;">
                                  <img src="https://labpartners.co.zw/wp-content/uploads/2022/09/logo-small.png" editable="true" width="184" height="auto" style="width: 184px;" alt="" border="0" class="hover toModifyImage">
                                </a>
                              </td>
                            </tr>
                          </tbody></table>

                          <table width="1" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="full">
                            <tbody><tr>
                              <td width="100%" height="40"></td>
                            </tr>
                          </tbody></table>
                          
                          <table width="375" border="0" cellpadding="0" cellspacing="0" align="right" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="fullCenter">
                            <tbody><tr>
                              <td width="100%" style="font-size: 26px; color: #4e4e4e; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; line-height: 32px; vertical-align: top; font-weight: 600;">
                                Request Rejected
                              </td>
                            </tr>
                            <tr>
                              <td width="100%" height="25"></td>
                            </tr>
                            <tr>
                              <td width="100%" style="font-size: 14px; color: #8d9499; text-align: left; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; line-height: 26px; vertical-align: top; font-weight: 400;" class="fullCenter">
                                <strong><span style="color: rgb(0, 0, 0);">Dear ${userName}</span></strong><br><br><br>
                                <span style="color: rgb(0, 0, 0);">Your inventory request has been <strong>rejected</strong> with the following details:</span><br><br>
                                <strong>Request Details:</strong><br>
                                <strong><span style="color: rgb(0, 0, 0);">Request ID:</span></strong> ${requisitionId}<br>
                                <strong><span style="color: rgb(0, 0, 0);">Date Rejected:</span></strong> ${currentDate}<br>
                                <strong><span style="color: rgb(0, 0, 0);">Rejected By:</span></strong> ${rejectorName}<br>
                                <strong><span style="color: rgb(0, 0, 0);">Stage:</span></strong> ${stage}<br>
                                <strong><span style="color: rgb(0, 0, 0);">Reason:</span></strong> ${reason}<br><br>
                                <span style="color: rgb(0, 0, 0);">Please login to the system to view the full details and submit a new request if needed.</span>
                              </td>
                            </tr>
                            <tr><td width="100%" height="45"></td></tr>
                            <tr>
                              <td width="100%" class="buttonScale" align="left">
                                <span class="featuredHolder">
                                  <table border="0" cellpadding="0" cellspacing="0" align="left" class="buttonScale">
                                    <tbody><tr>
                                      <td width="100%" align="center" height="38" bgcolor="#fc505a" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; padding-left: 25px; padding-right: 25px; font-weight: 600; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; color: #ffffff; font-size: 13px;">
                                        <multiline><a href="https://app.labpartners.co.zw/requisitions" style="color: #ffffff; font-size: 13px; text-decoration: none; line-height: 13px; width: 100%;">View Request</a></multiline>
                                      </td>
                                    </tr>
                                  </tbody></table>
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td width="100%" height="18"></td>
                            </tr>
                          </tbody></table>
                        </td>
                      </tr>
                    </tbody></table>

                    <table width="100%" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="full">
                      <tbody><tr>
                        <td width="100%" height="70"></td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" bgcolor="#23282b" style="background-color: rgb(35, 40, 43);">
          <tbody><tr>
            <td width="100%" valign="top"> 
              <table width="600" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody><tr>
                  <td width="100%">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" align="left" style="text-align: center;" class="fullCenter">
                      <tbody><tr>
                        <td width="100%" height="25"></td>
                      </tr>
                      <tr>
                        <td width="100%" style="text-align: center; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; font-size: 13px; color: #8d9499; font-weight: 400;" class="fullCenter">
                          <span style="color: #ffffff;">© 2024 All rights Reserved - Powered by <strong><a href="https://soxfort.com" style="color: #ffffff;">Soxfort Solutions</a></strong> | Intuitive Innovation</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="100%" height="24"></td>
                      </tr>
                      <tr>
                        <td width="100%" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>
        </body>
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

    const currentDate = new Date().toLocaleDateString();
    const userName = requesterEmail.split('@')[0]; // Extract name from email

    // Generate products table HTML
    const productsTable = issuedProducts.map((product, index) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${product.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${product.issuedQuantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${product.unit}</td>
      </tr>
    `).join('');

    await transporter.sendMail({
      from: '"Lab Partners Portal" <labpartnerswebportal@gmail.com>',
      to: requesterEmail,
      subject: "Inventory Request Issued",
      html: `
        <style type="text/css">
        body *{font-family: 'Open Sans', Arial, sans-serif }
        div, p, a, li, td { -webkit-text-size-adjust:none; }
        *{-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;}
        td{word-break: break-word;}
        a{word-break: break-word; text-decoration: none; color: inherit;}
        body td img:hover {opacity:0.85;filter:alpha(opacity=85);}
        body .ReadMsgBody{width: 100%; background-color: #ffffff;}
        body .ExternalClass{width: 100%; background-color: #ffffff;}
        body{width: 100%; height: 100%; background-color: #ffffff; margin:0; padding:0; -webkit-font-smoothing: antialiased;}
        html{ background-color:#ffffff; width: 100%;}
        body p {padding: 0!important; margin-top: 0!important; margin-right: 0!important; margin-bottom: 0!important; margin-left: 0!important; }
        body img {user-drag: none; -moz-user-select: none; -webkit-user-drag: none;}
        body .hover:hover {opacity:0.85;filter:alpha(opacity=85);}
        body .fullImage img {width: 600px;height: auto;text-align: center;} 
        body .img184 img{width:184px; height: auto;}
        body .buttonScale {float: none!important; text-align: center!important; display: inline-block!important; margin: 0px!important; clear: both;}
        body .fullBorderRadius {-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px;}
        </style>
        
        <body style='margin: 0; padding: 0;'>
        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" bgcolor="rgb(6, 3, 3)" style="background-color: rgb(6, 3, 3);">
          <tbody><tr>
            <td width="100%" valign="top">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody><tr>
                  <td>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
                      <tbody><tr>
                        <td width="100%" height="50"></td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>
        
        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
          <tbody><tr>
            <td width="100%" valign="top" bgcolor="#f3f3f3"> 
              <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody><tr>
                  <td>
                    <table width="600" border="0" cellpadding="0" cellspacing="0" align="center" class="full">
                      <tbody><tr>
                        <td width="100%">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="full">
                            <tbody><tr>
                              <td width="100%" height="70"></td>
                            </tr>
                          </tbody></table>

                          <table width="184" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="fullCenter">
                            <tbody><tr>
                              <td width="100%" class="img184">
                                <a href="#" style="text-decoration: none;">
                                  <img src="https://labpartners.co.zw/wp-content/uploads/2022/09/logo-small.png" editable="true" width="184" height="auto" style="width: 184px;" alt="" border="0" class="hover toModifyImage">
                                </a>
                              </td>
                            </tr>
                          </tbody></table>

                          <table width="1" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="full">
                            <tbody><tr>
                              <td width="100%" height="40"></td>
                            </tr>
                          </tbody></table>
                          
                          <table width="375" border="0" cellpadding="0" cellspacing="0" align="right" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="fullCenter">
                            <tbody><tr>
                              <td width="100%" style="font-size: 26px; color: #4e4e4e; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; line-height: 32px; vertical-align: top; font-weight: 600;">
                                Items Issued
                              </td>
                            </tr>
                            <tr>
                              <td width="100%" height="25"></td>
                            </tr>
                            <tr>
                              <td width="100%" style="font-size: 14px; color: #8d9499; text-align: left; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; line-height: 26px; vertical-align: top; font-weight: 400;" class="fullCenter">
                                <strong><span style="color: rgb(0, 0, 0);">Dear ${userName}</span></strong><br><br><br>
                                <span style="color: rgb(0, 0, 0);">Your inventory request has been processed and the items have been issued.</span><br><br>
                                <strong>Request Details:</strong><br>
                                <strong><span style="color: rgb(0, 0, 0);">Request ID:</span></strong> ${requisitionId}<br>
                                <strong><span style="color: rgb(0, 0, 0);">Date Issued:</span></strong> ${currentDate}<br><br>
                                <strong><span style="color: rgb(0, 0, 0);">Issued Items:</span></strong><br><br>
                                <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
                                  <thead>
                                    <tr style="background-color: #f2f2f2;">
                                      <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">No.</th>
                                      <th style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Product</th>
                                      <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Quantity</th>
                                      <th style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">Unit</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${productsTable}
                                  </tbody>
                                </table>
                                ${notes ? `<br><strong><span style="color: rgb(0, 0, 0);">Notes:</span></strong> ${notes}<br>` : ''}
                                <br><span style="color: rgb(0, 0, 0);">Please login to the system to view the full details and confirm receipt.</span>
                              </td>
                            </tr>
                            <tr><td width="100%" height="45"></td></tr>
                            <tr>
                              <td width="100%" class="buttonScale" align="left">
                                <span class="featuredHolder">
                                  <table border="0" cellpadding="0" cellspacing="0" align="left" class="buttonScale">
                                    <tbody><tr>
                                      <td width="100%" align="center" height="38" bgcolor="#fc505a" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; padding-left: 25px; padding-right: 25px; font-weight: 600; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; color: #ffffff; font-size: 13px;">
                                        <multiline><a href="https://app.labpartners.co.zw/requisitions" style="color: #ffffff; font-size: 13px; text-decoration: none; line-height: 13px; width: 100%;">View Request</a></multiline>
                                      </td>
                                    </tr>
                                  </tbody></table>
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td width="100%" height="18"></td>
                            </tr>
                          </tbody></table>
                        </td>
                      </tr>
                    </tbody></table>

                    <table width="100%" border="0" cellpadding="0" cellspacing="0" align="left" style="border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt;" class="full">
                      <tbody><tr>
                        <td width="100%" height="70"></td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" bgcolor="#23282b" style="background-color: rgb(35, 40, 43);">
          <tbody><tr>
            <td width="100%" valign="top"> 
              <table width="600" border="0" cellpadding="0" cellspacing="0" align="center" class="mobile">
                <tbody><tr>
                  <td width="100%">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" align="left" style="text-align: center;" class="fullCenter">
                      <tbody><tr>
                        <td width="100%" height="25"></td>
                      </tr>
                      <tr>
                        <td width="100%" style="text-align: center; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; font-size: 13px; color: #8d9499; font-weight: 400;" class="fullCenter">
                          <span style="color: #ffffff;">© 2024 All rights Reserved - Powered by <strong><a href="https://soxfort.com" style="color: #ffffff;">Soxfort Solutions</a></strong> | Intuitive Innovation</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="100%" height="24"></td>
                      </tr>
                      <tr>
                        <td width="100%" height="1" style="font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </tbody></table>
                  </td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>
        </body>
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

export default router;
