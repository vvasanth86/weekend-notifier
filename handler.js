'use strict';
const nodemailer = require("nodemailer");
const axios = require("axios");
const fs = require("fs");
const _ = require("underscore");

// create reusable transport method (opens pool of SMTP connections)
const smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PWD
    }
});

// setup e-mail data with unicode symbols
// Message object
let message = {
  // Comma separated list of recipients
  to: 'vvasanth86@gmail.com',
  // Subject of the message
  subject: 'Nodemailer is unicode friendly ✔'
};

exports.weekendNotifier = async (event, context) => {
  let response = {
      "statusCode": 200,
    	"isBase64Encoded": false,
    	"body": "",
    	"headers": {
    		"Content-Type": "application/json"
    	}
  }
  
  try {
    // Fetch subscribers
    const irctcSubs = await axios('https://asd8wi4zo3.execute-api.ap-south-1.amazonaws.com/beta/users?preference=irctc');
    console.log("Subs: " + irctcSubs.data);

    // Setup email template
    let data = {
      title: "Planning a trip for upcoming long weekend on <>?",
      message: "IRCTC opens booking today. Hurry to avoid tatkal hassle."
    }

    let reminderContent = fs.readFileSync('./templates/reminder.html', "utf8");
    let reminderTemplate = _.template(reminderContent, { interpolate: /\{\{(.+?)\}\}/g });
    message.html = reminderTemplate(data);
    message.subject = "[REMINDR] Upcoming Long Weekend!";

    // send emails
    const info = await smtpTransport.sendMail(message);
    console.log('Message sent successfully!');
    console.log(nodemailer.getTestMessageUrl(info));

    // only needed when using pooled connections
    smtpTransport.close();
  } catch (e) {
    console.error(e.message);
  }
  return response
}