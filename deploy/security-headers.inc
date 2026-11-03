# Bezpečnostné hlavičky – opakujú sa v každom location bloku (add_header v location prebije tie zo server bloku).
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header X-Frame-Options DENY always;
add_header Content-Security-Policy "frame-ancestors 'none'" always;
add_header Permissions-Policy "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Cross-Origin-Opener-Policy same-origin always;
