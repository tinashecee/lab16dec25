const SENDMAIL = require("../mailer.cjs");

const SENDLEAVEAPPRESEMAIL = async (
  userName,
  response,
  requestId,
  leaveType,
  dateRequested,
  startDate,
  endDate,
  leaveDays,
  email,
  comments
) => {
  const message = "Your Leave Application Response";
  const options = {
    from: "Lab Partners <mochonam19@gmail.com>", // sender address
    to: email, // receiver email
    subject: `Your leave application has been ${response}`, // Subject line
    text: message,
    html: `
        <style type="text/css">

body *{font-family: 'Open Sans', Arial, sans-serif }

div, p, a, li, td { -webkit-text-size-adjust:none; }

*{-webkit-font-smoothing: antialiased;-moz-osx-font-smoothing: grayscale;}
td{word-break: break-word;}
a{word-break: break-word; text-decoration: none; color: inherit;}
body td img:hover {opacity:0.85;filter:alpha(opacity=85);}

body .ReadMsgBody
{width: 100%; background-color: #ffffff;}
body .ExternalClass
{width: 100%; background-color: #ffffff;}
body{width: 100%; height: 100%; background-color: #ffffff; margin:0; padding:0; -webkit-font-smoothing: antialiased;}
html{ background-color:#ffffff; width: 100%;}

body #box {-webkit-animation: bounceInLeftFast 1.5s;-moz-animation: bounceInLeftFast 1.5s;-o-animation: bounceInLeftFast 1.5s;	animation: bounceInLeftFast 1.5s; -webkit-backface-visibility: visible !important;-ms-backface-visibility: visible !important;backface-visibility: visible !important;-webkit-animation-name: bounceInLeftFast;animation-name: bounceInLeftFast; -webkit-animation-delay: 1s; animation-delay: 1s;}
 

@-webkit-keyframes bounceInLeftFast {
  0% { -webkit-transform: perspective(400px) rotate3d(1, 0, 0, 90deg); transform: perspective(400px) rotate3d(1, 0, 0, 90deg); -webkit-transition-timing-function: ease-in; transition-timing-function: ease-in; opacity: 0;}

  40% {-webkit-transform: perspective(400px) rotate3d(1, 0, 0, -20deg);transform: perspective(400px) rotate3d(1, 0, 0, -20deg);-webkit-transition-timing-function: ease-in;transition-timing-function: ease-in;}

  60% {-webkit-transform: perspective(400px) rotate3d(1, 0, 0, 10deg);transform: perspective(400px) rotate3d(1, 0, 0, 10deg);opacity: 1;}

  80% {-webkit-transform: perspective(400px) rotate3d(1, 0, 0, -5deg);transform: perspective(400px) rotate3d(1, 0, 0, -5deg);}

  100% {-webkit-transform: perspective(400px);transform: perspective(400px);}
}

@keyframes bounceInLeftFast {
  0% {-webkit-transform: perspective(400px) rotate3d(1, 0, 0, 90deg);-ms-transform: perspective(400px) rotate3d(1, 0, 0, 90deg);transform: perspective(400px) rotate3d(1, 0, 0, 90deg); -webkit-transition-timing-function: ease-in;transition-timing-function: ease-in;opacity: 0;}

  40% {-webkit-transform: perspective(400px) rotate3d(1, 0, 0, -20deg);-ms-transform: perspective(400px) rotate3d(1, 0, 0, -20deg);transform: perspective(400px) rotate3d(1, 0, 0, -20deg);-webkit-transition-timing-function: ease-in;transition-timing-function: ease-in;}

  60% {-webkit-transform: perspective(400px) rotate3d(1, 0, 0, 10deg);-ms-transform: perspective(400px) rotate3d(1, 0, 0, 10deg);transform: perspective(400px) rotate3d(1, 0, 0, 10deg);opacity: 1;}

  80% {-webkit-transform: perspective(400px) rotate3d(1, 0, 0, -5deg);-ms-transform: perspective(400px) rotate3d(1, 0, 0, -5deg);transform: perspective(400px) rotate3d(1, 0, 0, -5deg);}

  100% {-webkit-transform: perspective(400px);-ms-transform: perspective(400px);transform: perspective(400px);} 
}

body p {padding: 0!important; margin-top: 0!important; margin-right: 0!important; margin-bottom: 0!important; margin-left: 0!important; }
body img {user-drag: none; -moz-user-select: none; -webkit-user-drag: none;}
body .hover:hover {opacity:0.85;filter:alpha(opacity=85);}
body .jump:hover {opacity:0.75; filter:alpha(opacity=75); padding-top: 10px!important;}

body .fullImage img {width: 600px;height: auto;text-align: center;} 
body .logo img {width: 118px; ;height: auto;}
body .bigScreenLeft{float:left;} 
body .img125 img{width:125px; height: auto;}
body .img100 img{width:100px; height: auto;}
body .avatar img{width:83px; height: auto;}
body .logo84 img{width:84px; height: auto;}
body .img184 img{width:184px; height: auto;}
body .img50 img {width: 148px; height: auto;}
body .image175 img {width: 175px; height: auto;}
body .mobile-full-img{max-width:100%!important;}
body .opacity img{opacity: 0.2;  filter: alpha(opacity=20);}
body a:hover.opacity img{opacity: 1!important; filter: alpha(opacity=100);}
body a.opacity:hover img{opacity: 1!important; filter: alpha(opacity=100);}
body .fullImage img {width: 600px; height: auto;}
body .header-img img {width: 306px; height: auto;}

</style>

<style type="text/css">@media only screen and (max-width: 640px){
		body body{width:auto!important;}
		body table[class=full] {width: 100%!important; clear: both; }
		body table[class=mobile] {width: 100%!important; padding-left: 20px; padding-right: 20px; clear: both; }
		body td[class=mobile] {width: 100%!important; text-align: center!important;  padding-left: 20px; padding-right: 20px; clear: both; }
		body table[class=fullCenter] {width: 100%!important; text-align: center!important; clear: both; }		 
		body td[class=fullCenter] {width: 100%!important; text-align: center!important; clear: both; }
		body .erase {display: none;}
		body table[class=fullImage]{width: 100%!important; height: auto!important; text-align: center!important; clear: both; }
		body .fullImage img {width: 100%!important; height: auto!important; text-align: center!important; clear: both; }		 
		body .nbsp {display: none;}
		body .floatCenter {text-align: center!important; float: center!important; }
		body .bigScreenLeft{float:none!important}
		body .halfCenter{width:50%; text-align:center;}
		body .clr{clear:both}
		body .logo img{max-width:150px;}
		body .mobile-full-img{width:100%!important;}
		body .mobileheading{font-size:36px!important}
		body table[class=img50] {width: 50%!important;}
		body .img50 img {width: 100%!important;}
		body table[class=img50Clear] {width: 50%!important; clear: both;}
		body .img50Clear img {width: 100%!important; clear: both;}
		body .image175 img {width: 175px!important; height: auto;}
		body *[class=buttonScale] {float: none!important; text-align: center!important; display: inline-block!important; margin: 0px!important; clear: both;}
		body *[class=fullBorderRadius] {-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px;}
		body table[class=mcenter] {text-align:center; vertical-align:middle; clear:both!important; float:none; margin: 0px!important;}

}</style>

<style type="text/css">@media only screen and (max-width: 479px){
		body body{width:auto!important;}
		body table[class=full] {width: 100%!important; clear: both; }
		body table[class=mobile] {width: 100%!important; padding-left:20px!important; padding-right: 20px!important; clear: both;  }
		body td[class=mobile] {width: 100%!important; text-align: center!important; padding-left: 20px; padding-right: 20px; clear: both; }
		body table[class=fullCenter] {width: 100%!important; text-align: center!important; clear: both; }
		body td[class=fullCenter] {width: 100%!important; text-align: center!important; clear: both; }
		body .erase {display: none;}
		body img[class=fullImage] { width: 100%!important; height: auto!important; }
		body table[class=fullImage] {width: 100%!important; height: auto!important; text-align: center!important; clear: both; }
		body .fullImage img {width: 100%!important; height: auto!important; text-align: center!important; clear: both; }
		body .nbsp {display: none;}
		body .floatCenter {text-align: center!important; float: center!important;}
		body .full-btn{width: 100%!important; clear: both!important; float:left; }
		body .bigScreenLeft{float:none!important}
		body .clr{clear:both}
		body .padding{display:block;  padding:0 20px!important; clear:both;}
		body .mfullCenter {width: 100%!important; text-align: center!important; clear: both; }
		body .mmobile {display:block;  width:90% ;padding-left:20px!important; padding-right: 20px!important; clear: both;   }
		body .mobileheading{font-size:30px!important} 
		body .header-img img{width:100%!important}
		body table[class=img50] {width: 50%!important;}
		body .img50 img {width: 100%!important;}
		body table[class=img50Clear] {width: 50%!important; clear: both;}
		body .img50Clear img {width: 100%!important; clear: both;}
		body .imgage270 img {width: 100%!important; clear: both;}	
		body .image175 img {width: 100%!important; height: auto;}
		body *[class=buttonScale] {float: none!important; text-align: center!important; display: inline-block!important; margin: 0px!important; clear: both;}
		body *[class=fullBorderRadius] {-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px;}
		body body[yahoo] .full-mobile{width:100%; text-align: center;}
		body table[class=mcenter] {text-align:center; vertical-align:middle; clear:both!important; float:none; margin: 0px!important;}

}</style>

</head>
<body style='margin: 0; padding: 0;'>

<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" bgcolor="rgb(6, 3, 3)" style="background-color: rgb(6, 3, 3);">
	<tbody ><tr>
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
</tbody> </table>
<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full"></table><table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" style="pointer-events: auto; top: 0px; left: 0px;"><table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" style="pointer-events: auto; top: 0px; left: 0px;">
	<tbody ><tr>
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
												<a href="http://www.labpartners.co.zw" style="text-decoration: none;">
													<img src="https://labpartners.co.zw/wp-content/uploads/2022/09/logo-small.png" editable="true" width="184" height="auto" style="width: 184px;" alt="" border="0" class="hover toModifyImage" >
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
												<span style="color: rgb(0, 0, 0);" >Leave Application <span style="font-family: 'Open Sans';" >Confirmation| ${response}</span></span>
											</td>
										</tr>
										<tr>
											<td width="100%" height="25"></td>
										</tr>
										<tr>
											<td width="100%" style="font-size: 14px; color: #8d9499; text-align: left; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; line-height: 26px; vertical-align: top; font-weight: 400;" class="fullCenter">
											  <span style="font-size: 14pt;" ><strong><span style="color: rgb(0, 0, 0);" >Dear ${userName}</span></strong></span><br><em>
												<span style="color: rgb(0, 0, 0); font-size: 12pt;" ></span></em></p>
											  <p><em><span style="color: rgb(0, 0, 0); font-size: 12pt;" >Your leave application with the following details has been ${response}:</span></em></p>
											  <p><span style="font-size: 12pt;" ><span style="color: rgb(0, 0, 0);" >Request ID: <strong>${requestId}</strong></span></span><br><span style="font-size: 12pt;" >
												<span style="color: rgb(0, 0, 0);" >Leave Type: <strong>${leaveType}</strong></span></span><br><span style="font-size: 12pt;" ><span style="color: rgb(0, 0, 0);" >Date Requested:</span> 
												<strong><span style="color: rgb(0, 0, 0);" >${dateRequested}</span></strong></span>
												<br><span style="font-size: 12pt;" ><span style="color: rgb(0, 0, 0);" >Start Date:</span> <strong><span style="color: rgb(0, 0, 0);" > ${startDate}</span></strong></span>
												<br><span style="font-size: 12pt;" ><span style="color: rgb(0, 0, 0);" >End Date:</span><strong> <span style="color: rgb(0, 0, 0);" >${endDate}</span></strong></span><br>
												<span style="font-size: 12pt;" ><span style="color: rgb(0, 0, 0);" >Leave Days:</span><strong><span style="color: rgb(0, 0, 0);" > ${leaveDays}</span></strong></span></p><p>
													<span style="font-size: 12pt;" ><span style="color: rgb(0, 0, 0);" >Reviewed by:</span> <strong><span style="color: rgb(0, 0, 0);" >Admin</span></strong></span></p><p><span style="font-size: 12pt;" ><strong>
														<span style="color: rgb(0, 0, 0);" >Comments:</span></strong></span></p><p><span style="font-size: 12pt;" ><em><span style="color: rgb(0, 0, 0);" >
															${comments}</span></em></span>
											</td>
										  </tr>
										<tr>
											<td width="100%" height="45"></td>
										</tr>
										<!-- Button Left -->
										<tr>
											<td width="100%" class="buttonScale" align="left">
												
												<span class="featuredHolder"><table border="0" cellpadding="0" cellspacing="0" align="left" class="buttonScale repeaterFull">
													<tbody><tr>
														<td width="100%" align="center" height="38" bgcolor="#fc505a" style="-webkit-border-radius: 5px; -moz-border-radius: 5px; border-radius: 5px; padding-left: 25px; padding-right: 25px; font-weight: 600; font-family: Helvetica, Arial, sans-serif, 'Open Sans'; color: #ffffff; font-size: 13px;">
															<multiline><a href="https://app.labpartners.co.zw/leave-request" style="color: #ffffff; font-size: 13px; text-decoration: none; line-height: 13px; width: 100%;">View Application</a></multiline>
														</td>
													</tr>
												</tbody></table></span>
												
											
											</td>
										</tr>
										<!-- End Button Left -->
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
<!--—EndModule--></tbody> </table></table><!--—EndPremade-->

<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" class="full" bgcolor="#23282b" style="background-color: rgb(35, 40, 43);">
	<tbody ><tr>
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
									<span style="color: #ffffff;">© 2023 All rights Reserved - Powered by <strong><a href="https://www.soxfort.com">Soxfort Solutions</a> </strong>| Intuitive Innovation</span>
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
<!--—EndModule--></tbody></table></body>
        `,
  };
  // send mail with defined transport object and mail options
  SENDMAIL(options, (info) => {});
};

module.exports = SENDLEAVEAPPRESEMAIL;
