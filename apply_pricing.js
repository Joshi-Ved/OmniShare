const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'stitch', 'app');

const replacements = [
  { from: /Red Komodo 6K Cinema Package/g, to: 'Sony A7S III Camera Rig' },
  { from: /Red Komodo 6K/g, to: 'Sony A7S III' },
  { from: /1964 Porsche 356 Rental/g, to: 'Sony PlayStation 5 Pro' },
  { from: /1964 Porsche 356/g, to: 'PlayStation 5 Pro' },
  { from: /Minimalist Horology Set/g, to: 'DJI Mavic 3 Cine Drone' },
  { from: /₹42,000/g, to: '₹3,000' },
  { from: /\$500\/day/g, to: '$35/day' },
  { from: /₹67,000/g, to: '₹1,500' },
  { from: /\$800 day/g, to: '$18 day' },
  { from: /₹33,500/g, to: '₹2,500' },
  { from: /\$400 day/g, to: '$30 day' },
  { from: /₹31,500/g, to: '₹2,800' },
  { from: /₹33,600/g, to: '₹2,000' },
  { from: /₹37,800/g, to: '₹2,200' },
  { from: /₹46,200/g, to: '₹2,600' },
  { from: /₹31,080/g, to: '₹2,100' },
  { from: /₹63,000/g, to: '₹2,900' },
  { from: /₹30,240/g, to: '₹2,000' },
  { from: /₹20,500/g, to: '₹3,000' }, 
  { from: /₹61,500/g, to: '₹9,000' }, 
  { from: /₹1,16,745/g, to: '₹11,500' }, 
  { from: /₹1,05,345/g, to: '₹11,500' },
  { from: /₹80,000\+/g, to: '₹3,000' },
  { from: /₹2,50,000/g, to: '₹1,50,000' },
  // Image links adjustments
  { from: /https:\/\/lh3.googleusercontent.com\/aida-public\/AB6AXuBVCG12C-0nOiDEiTfmwHfu7KZhZYaY_7owyK8qGucBWtaA89fkR8ZM1HE5NW08xSIOMw4KJ5WdFMnpCc4SzPgGJyhX4GS_RmqU8XV6XztyhpbAVNlP_1Pdq7DzU131HWoJpIVjXpYKfbSWHvp2cmGJTKUp589vGX13jLj2tj_0EV0lbFcb7kd0L7o2F_w5l8hhs5ve9zeyuCL_M_I2UMVo-r1dKrOpsdKGP_7B0BBomASEyaF-kSfus_mQBfp6FQlsZrgvsKOWArU/g, to: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=600&auto=format&fit=crop' }, // Car to PS5
  { from: /https:\/\/lh3.googleusercontent.com\/aida-public\/AB6AXuCJWaRzn8MoU5L-hXmPDFdwodCjgVqeXXUwXlzp3dQaOArx5P4DfpMsi_zIkroy8uPXma8A8gqjT6bpm5WxLEilUJzZa4e8n7mMFMvYUPUfL1ePz4fZtdDr12iuN8_E19zKAtyHyjwdwP23Z5Vc_jFMndwefBtIsKmnc1H5-K6gaiOLDUW6-6rHSqZVGt5F3pbP9uA8dbG3S3xMhm-0dBCoF-QxziyR_UOIRW3D0rEK0DpTzRWhVtlrrfqgjWYusWc8sGNa5z5cbCU/g, to: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?q=80&w=600&auto=format&fit=crop' } // Watch to Drone
];

fs.readdir(directoryPath, (err, files) => {
  if (err) return console.error('Unable to scan directory: ' + err); 
  files.forEach((file) => {
    if (file.endsWith('.html')) {
      const filePath = path.join(directoryPath, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      replacements.forEach(r => {
        content = content.replace(r.from, r.to);
      });

      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Processed pricing/products in', file);
    }
  });
});
