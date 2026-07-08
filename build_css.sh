#!/bin/bash
npx @tailwindcss/cli -i static/css/input.css -o static/css/tailwind.css --minify
echo "Tailwind CSS built: $(wc -c < static/css/tailwind.css) bytes"
