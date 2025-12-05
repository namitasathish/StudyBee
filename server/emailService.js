const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text email body
 * @param {string} [options.html] - HTML email body (optional)
 * @returns {Promise<boolean>} - True if email was sent successfully
 */
async function sendEmail({ to, subject, text, html }) {
  try {
    await transporter.sendMail({
      from: `"LearningBuddyAI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Generates a study plan email
 * @param {Object} studyPlan - Study plan data
 * @returns {string} - Formatted email body
 */
function generateStudyPlanEmail(studyPlan) {
  // Simple text version
  let text = `Study Plan for ${studyPlan.courseCode} - ${studyPlan.courseTitle}\n\n`;
  
  studyPlan.modules.forEach(module => {
    text += `${module.moduleLabel}:\n`;
    module.topics.forEach(topic => {
      text += `- ${topic.name}`;
      if (topic.priority) text += ` (Priority: ${topic.priority})`;
      text += '\n';
      
      if (topic.resources && topic.resources.length > 0) {
        text += '  Resources:\n';
        topic.resources.forEach(resource => {
          text += `  - ${resource.title || resource.type}: ${resource.url}\n`;
        });
      }
    });
    text += '\n';
  });
  
  return text;
}

module.exports = {
  sendEmail,
  generateStudyPlanEmail,
};
