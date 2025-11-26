const nodemailer = require('nodemailer');
require('dotenv').config();

// Test Gmail configuration
const testGmail = async () => {
  console.log('🧪 Testing Gmail Configuration...');
  console.log('📧 Email User:', process.env.EMAIL_USER);
  console.log('🔑 Email Password:', process.env.EMAIL_PASSWORD ? 'Set' : 'Not set');
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ Gmail connection successful!');
    
    // Test email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'Gmail Test - Traincape LMS',
      html: '<h1>Gmail Test Successful!</h1><p>Your email configuration is working correctly.</p>'
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    
  } catch (error) {
    console.error('❌ Gmail test failed:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n🔧 Troubleshooting Steps:');
      console.log('1. Enable 2-Step Verification on your Google Account');
      console.log('2. Generate an App Password (not regular password)');
      console.log('3. Use the 16-character App Password');
      console.log('4. Make sure EMAIL_USER is your full Gmail address');
    }
  }
};

// Run test
testGmail(); 