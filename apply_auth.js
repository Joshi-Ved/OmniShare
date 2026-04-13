const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'stitch', 'app');

const authScript = `
<!-- Global Auth Script -->
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('omni_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      document.querySelectorAll('a').forEach(a => {
        const text = a.textContent.trim();
        const href = a.getAttribute('href');
        
        if (text === 'Sign In' || href === 'signin.html') {
          a.textContent = 'My Profile';
          a.href = 'profile.html';
        }
        
        if (text === 'Join Now' || text === 'Get Started' || text === 'Create Account' || href === 'signup.html') {
          a.style.display = 'none';
        }
        
        if (user.role === 'renter' && (text === 'List an Item' || href === 'owner_portal.html')) {
          a.style.display = 'none';
        }
      });

      // Simple profile customization
      if (window.location.pathname.includes('profile.html') || window.location.href.includes('profile.html')) {
        const h1s = document.querySelectorAll('h1');
        h1s.forEach(h1 => {
          if (h1.textContent.includes('Welcome') || h1.textContent.includes('Julian')) {
            h1.textContent = 'Welcome, ' + user.email.split('@')[0].toUpperCase();
          }
        });
        
        // Add logout button
        const header = document.querySelector('header .flex.items-center.gap-4') || document.querySelector('nav .flex.items-center.gap-6');
        if (header && !document.getElementById('logout-btn')) {
          const btn = document.createElement('button');
          btn.id = 'logout-btn';
          btn.textContent = 'Log Out';
          btn.className = 'text-error font-medium hover:text-error/80 transition-colors ml-4';
          btn.onclick = () => {
            localStorage.removeItem('omni_user');
            window.location.href = 'landing.html';
          };
          header.appendChild(btn);
        }
      }
    }
  });
</script>
</body>`;

fs.readdir(directoryPath, (err, files) => {
  if (err) return console.error('Unable to scan directory: ' + err); 
  files.forEach((file) => {
    if (file.endsWith('.html')) {
      const filePath = path.join(directoryPath, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Remove previously injected script if any to avoid duplication
      content = content.replace(/<!-- Global Auth Script -->[\s\S]*?<\/script>\s*<\/body>/, '</body>');
      
      if (content.includes('</body>')) {
        content = content.replace('</body>', authScript);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Injected auth script into', file);
      }
    }
  });
});
