# IP Finder & Tracer

A modern, single-page IP finder and tracer application with neomorphism design, built for Firebase hosting.

## Features

- **Automatic IP Detection**: Displays your current IP address and location on load
- **IP Tracing**: Enter any IP address to get geolocation information
- **Interactive Map**: OpenStreetMap integration with location pinpointing
- **Modern Neomorphism Design**: Clean, modern UI with soft shadows
- **4 Ad Banner Spaces**: Pre-configured ad spaces ready for your advertisements
- **No Data Storage**: One-time access only, no data is saved
- **Fully Responsive**: Works on desktop, tablet, and mobile devices

## Setup Instructions

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase (if not already done)

```bash
firebase init hosting
```

- Select your Firebase project or create a new one
- Set the public directory to `.` (current directory)
- Configure as a single-page app: Yes
- Don't overwrite existing files

### 4. Update Firebase Project ID

Edit `.firebaserc` and replace `"your-project-id"` with your actual Firebase project ID.

### 5. Deploy to Firebase

```bash
firebase deploy
```

Your app will be live at: `https://your-project-id.web.app`

## Ad Banner Spaces

The application includes 4 ad banner placeholders:

1. **Top Banner**: 728x90px (horizontal)
2. **Left Sidebar**: 160x600px (vertical, hidden on mobile)
3. **Right Sidebar**: 160x600px (vertical, hidden on mobile)
4. **Bottom Banner**: 728x90px (horizontal)

Replace the placeholder content in `index.html` with your ad code.

## API Used

This application uses the free [ipapi.co](https://ipapi.co/) API for geolocation data. No API key required for basic usage (up to 30,000 requests/month).

## Technologies

- HTML5
- CSS3 (Neomorphism Design)
- Vanilla JavaScript
- Leaflet.js (OpenStreetMap)
- Firebase Hosting
- ipapi.co API

## Local Testing

Simply open `index.html` in your browser, or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server
```

## License

Free to use and modify.
