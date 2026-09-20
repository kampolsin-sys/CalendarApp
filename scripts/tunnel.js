const { spawn } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 1. Get LINE token
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error("❌ ไม่พบไฟล์ .env");
  process.exit(1);
}
const env = fs.readFileSync(envPath, 'utf8');
const tokenMatch = env.match(/LINE_CHANNEL_ACCESS_TOKEN=([^\n\r]+)/);
if (!tokenMatch) {
  console.error("❌ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ในไฟล์ .env");
  process.exit(1);
}
const lineToken = tokenMatch[1].trim();

// 2. Start SSH Tunnel
console.log("🚇 กำลังเปิดอุโมงค์เชื่อมต่อ...");
const ssh = spawn('ssh', ['-o', 'StrictHostKeyChecking=accept-new', '-R', '80:localhost:3000', 'nokey@localhost.run']);

ssh.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);

  // Extract URL
  const urlMatch = output.match(/(https:\/\/[a-zA-Z0-9-]+\.lhr\.life)/);
  if (urlMatch) {
    const url = urlMatch[1];
    console.log(`\n✅ ได้รับ URL ใหม่: ${url}`);
    
    // 3. Update next.config.ts
    const nextConfigPath = path.join(__dirname, '..', 'next.config.ts');
    let nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
    const domain = url.replace('https://', '');
    nextConfig = nextConfig.replace(/allowedDevOrigins:\s*\[[\s\S]*?\]/, `allowedDevOrigins: [\n    "${domain}",\n    "*.lhr.life"\n  ]`);
    fs.writeFileSync(nextConfigPath, nextConfig);
    console.log("✅ อัปเดต next.config.ts อัตโนมัติเรียบร้อย");

    // 4. Update LINE Webhook API
    const webhookUrl = `${url}/api/webhook`;
    console.log(`📡 กำลังตั้งค่า LINE Webhook เป็น: ${webhookUrl} ...`);
    
    const payload = JSON.stringify({ endpoint: webhookUrl });
    const req = https.request('https://api.line.me/v2/bot/channel/webhook/endpoint', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${lineToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      if (res.statusCode === 200) {
        console.log("🎉 ติดตั้ง Webhook สำเร็จ! พร้อมใช้งานแล้ว ไม่ต้องไปก๊อปปี้วางเองแล้วครับ!");
      } else {
        console.log(`⚠️ ตั้งค่า Webhook ไม่สำเร็จ (Status: ${res.statusCode}) กรุณาตั้งค่าเองที่เว็บ LINE`);
      }
    });
    
    req.on('error', (e) => {
      console.error(`⚠️ เกิดข้อผิดพลาดในการเรียก LINE API: ${e.message}`);
    });
    
    req.write(payload);
    req.end();
  }
});

ssh.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

ssh.on('close', (code) => {
  console.log(`\n❌ อุโมงค์ถูกปิด (Code: ${code})`);
});
