const nodemailer = require("nodemailer");

// create reusable transporter object using the default SMTP transport
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

const SENDMAIL = async (mailDetails, callback) => {
	try {
		const info = await transporter.sendMail(mailDetails);
		callback(info);
		console.log(info);
	} catch (error) {
		console.log(error);
	}
};
module.exports = SENDMAIL;
