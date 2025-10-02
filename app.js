// Initialize map
let map;
let marker;

// Initialize the map
function initMap(lat = 0, lon = 0, zoom = 2) {
    if (map) {
        map.remove();
    }

    map = L.map('map').setView([lat, lon], zoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    if (lat !== 0 || lon !== 0) {
        addMarker(lat, lon);
    }
}

// Add or update marker
function addMarker(lat, lon, popupText = 'Location') {
    if (marker) {
        marker.remove();
    }

    marker = L.marker([lat, lon]).addTo(map);
    marker.bindPopup(popupText).openPopup();
    map.setView([lat, lon], 10);
}

// Fetch user's IP information on load
async function getUserIP() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.error) {
            throw new Error(data.reason || 'Failed to fetch IP data');
        }

        // Update UI with user's IP info
        document.getElementById('userIp').textContent = data.ip;
        document.getElementById('userCity').textContent = data.city || 'N/A';
        document.getElementById('userRegion').textContent = data.region || 'N/A';
        document.getElementById('userCountry').textContent = `${data.country_name || 'N/A'} (${data.country_code || '-'})`;
        document.getElementById('userISP').textContent = data.org || 'N/A';

        // Initialize map with user's location
        if (data.latitude && data.longitude) {
            initMap(data.latitude, data.longitude, 10);
            addMarker(data.latitude, data.longitude, `Your Location: ${data.city}, ${data.country_name}`);
        } else {
            initMap();
        }
    } catch (error) {
        console.error('Error fetching user IP:', error);
        document.getElementById('userIp').textContent = 'Error loading IP';
        initMap(); // Initialize empty map
    }
}

// Trace a specific IP address
async function traceIP(ip) {
    // Validate IP format
    const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipPattern.test(ip)) {
        showError('Please enter a valid IP address (e.g., 8.8.8.8)');
        return;
    }

    // Validate IP octets
    const octets = ip.split('.');
    if (octets.some(octet => parseInt(octet) > 255)) {
        showError('Invalid IP address. Each octet must be between 0 and 255.');
        return;
    }

    hideError();
    hideTraceResult();

    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.reason || 'Failed to fetch IP data');
        }

        // Update UI with traced IP info
        document.getElementById('tracedIp').textContent = data.ip;
        document.getElementById('traceCity').textContent = data.city || 'N/A';
        document.getElementById('traceRegion').textContent = data.region || 'N/A';
        document.getElementById('traceCountry').textContent = `${data.country_name || 'N/A'} (${data.country_code || '-'})`;
        document.getElementById('traceISP').textContent = data.org || 'N/A';
        document.getElementById('traceLat').textContent = data.latitude || 'N/A';
        document.getElementById('traceLon').textContent = data.longitude || 'N/A';

        // Show result
        showTraceResult();

        // Update map with traced location
        if (data.latitude && data.longitude) {
            addMarker(data.latitude, data.longitude, `${data.city}, ${data.country_name}`);
        }
    } catch (error) {
        console.error('Error tracing IP:', error);
        showError(`Error: ${error.message}`);
    }
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

// Hide error message
function hideError() {
    const errorElement = document.getElementById('errorMessage');
    errorElement.classList.add('hidden');
}

// Show trace result
function showTraceResult() {
    document.getElementById('traceResult').classList.remove('hidden');
}

// Hide trace result
function hideTraceResult() {
    document.getElementById('traceResult').classList.add('hidden');
}

// Event listeners
document.getElementById('traceBtn').addEventListener('click', () => {
    const ip = document.getElementById('ipInput').value.trim();
    if (ip) {
        traceIP(ip);
    } else {
        showError('Please enter an IP address');
    }
});

// Allow Enter key to trigger trace
document.getElementById('ipInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const ip = document.getElementById('ipInput').value.trim();
        if (ip) {
            traceIP(ip);
        } else {
            showError('Please enter an IP address');
        }
    }
});

// Initialize on page load
window.addEventListener('load', () => {
    getUserIP();
});
