'use strict';
const nodemailer = require("nodemailer");
const axios = require("axios");
const Moment = require('moment');
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);
const mrange = require("moment-range");
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
    const date = moment(); // moment('2019-02-02', 'YYYY-MM-DD');
    const year = date.format('YYYY');
    const holidays = await fetchHolidays(year);
    const longWeekendInOneMonth = fetchUpcomingLongWeekends(holidays, date, 30);
    const longWeekendInThreeMonths = fetchUpcomingLongWeekends(holidays, date, 120);
    const weekend = longWeekendInThreeMonths ? longWeekendInThreeMonths : longWeekendInOneMonth
    if (weekend) {
      const subs = await fetchSubscribers(longWeekendInThreeMonths ? "irctc" : "upcoming");
      await sendEmail(subs, weekend, longWeekendInThreeMonths);
    } else {
      console.log("Long Weekend not detected, skipping notification");
    }
  } catch (e) {
    console.error(e.message);
  }
  return response
}

/**
 * Identifies all the subscribed emails for the given preference
 *
 * @param {string} {preference} The user preference to filter subscribers
 *
 * @return {string[]} Returns an array of all subscribed email ids
 */
async function fetchSubscribers(preference) {
  const subs = await axios('https://asd8wi4zo3.execute-api.ap-south-1.amazonaws.com/beta/users?preference=' + preference);
  return subs.data;
}

/**
 * Fetchs holidays for the given year
 *
 * @param {string} {year} The year for which holidays have to be identified
 *
 * @return {object[]} Returns an array of holidays in given year
 */
async function fetchHolidays(year) {
  const holidaysData = await axios('https://ul4ecqb2cb.execute-api.ap-south-1.amazonaws.com/default/holidaysApi?year=' + year, {
    'headers': { 
      'x-api-key' : 'qWbG1SHMFd8j0cXnc4bwa7jnZm2G5EyT4oTb4U0C' 
    }
  });
  return holidaysData.data;
}

/**
 * Identifies upcoming long weekends (in 1 month and 3 months) for the given date
 *
 * @param {object[]} {allHolidays} An array of all holidays in current year
 * @param {moment} {date} The date for which to identify upcoming long weekends
 * @param {integer} {offest} The number of days offset
 *
 * @return {object[]} Returns upcoming long weekend in 1 month and 3 months
 */
function fetchUpcomingLongWeekends(allHolidays, date, offset) {
  const offsetDate = date.clone().add(offset, 'days');
  // const threeMonths = date.clone().add(120, 'days');
  const offsets = { "Monday": "-2", "Friday": "+2", "Tuesday": "-4", "Thursday": "+4" }

  const gazettedHolidays = allHolidays.filter(h => h.type === "Gazetted Holiday");
  const holidayRanges = gazettedHolidays.filter(h => Object.keys(offsets).includes(h.day)).map(h => ( { range: moment.range([moment(h.date), moment(h.date).add(offsets[h.day], 'days')].sort((m1, m2) => m1.toDate() > m2.toDate())), holiday: h } ));
  return holidayRanges.filter(hr => hr.range.contains(offsetDate))[0];
}

/**
 * Constructs email template and sends email
 *
 * @param {string[]} {subs} Array of subscribed email ids
 * @param {object} {weekend} Object representing the long weekend
 * @param {boolean} {weekendInThreeMonths} Identifies if the long weekend happens in 3 months from given date 
 */
async function sendEmail(subs, weekend, weekendInThreeMonths) {
  if (subs.length == 0) {
    console.log("No subscribers found, skipping email notification");
    return
  }

  // Setup email template
  let data = {
    title: "Planning a trip for upcoming long weekend on <>?",
    message: ""
  }

  const weekendStart = moment(weekend.range.start).format("dddd, Do, MMMM");
  const holidayDate = moment(weekend.holiday.date).format("MMM D, dddd");
  if (weekend.range.length === 4) {
    data.title = "Four days of long weekend, when you take one day leave starts from " + weekendStart + " on the occasion of " + weekend.holiday.name + " (" + holidayDate + ")"; 
  } else {
    data.title = "Three days of long weekend starts from " + weekendStart + " on the occasion of " + weekend.holiday.name  + " (" + holidayDate + ")"; 
  }

  data.message = weekendInThreeMonths ? "IRCTC opens booking today. Hurry to avoid tatkal hassle." : "";

  let reminderContent = fs.readFileSync('./templates/reminder.html', "utf8");
  let reminderTemplate = _.template(reminderContent, { interpolate: /\{\{(.+?)\}\}/g });

  message.to = subs;
  message.html = reminderTemplate(data);
  message.subject = "[REMINDR] Upcoming Long Weekend!";

  // send emails
  const info = await smtpTransport.sendMail(message);
  console.log('Message sent successfully!');
  console.log(nodemailer.getTestMessageUrl(info));

  // only needed when using pooled connections
  smtpTransport.close();
}