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

  // Detect browser information
  function getBrowserInfo() {
      const ua = navigator.userAgent;
      let browserName = 'Unknown';
      let browserVersion = 'Unknown';

      if (ua.indexOf('Firefox') > -1) {
          browserName = 'Firefox';
          browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || '';
      } else if (ua.indexOf('Edg') > -1) {
          browserName = 'Edge';
          browserVersion = ua.match(/Edg\/(\d+\.\d+)/)?.[1] || '';
      } else if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
          browserName = 'Chrome';
          browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || '';
      } else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
          browserName = 'Safari';
          browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || '';
      } else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) {
          browserName = 'Opera';
          browserVersion = ua.match(/(?:Opera|OPR)\/(\d+\.\d+)/)?.[1] || '';
      }

      return `${browserName} ${browserVersion}`;
  }

  // Detect OS information
  function getOSInfo() {
      const ua = navigator.userAgent;
      let os = 'Unknown OS';

      if (ua.indexOf('Win') > -1) {
          if (ua.indexOf('Windows NT 10.0') > -1) os = 'Windows 10/11';
          else if (ua.indexOf('Windows NT 6.3') > -1) os = 'Windows 8.1';
          else if (ua.indexOf('Windows NT 6.2') > -1) os = 'Windows 8';
          else if (ua.indexOf('Windows NT 6.1') > -1) os = 'Windows 7';
          else os = 'Windows';
      } else if (ua.indexOf('Mac') > -1) {
          os = 'macOS';
      } else if (ua.indexOf('X11') > -1 || ua.indexOf('Linux') > -1) {
          os = 'Linux';
      } else if (ua.indexOf('Android') > -1) {
          os = 'Android';
      } else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
          os = 'iOS';
      }

      return os;
  }

  // Detect device type
  function getDeviceType() {
      const ua = navigator.userAgent;

      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
          return 'Tablet';
      } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
          return 'Mobile';
      }
      return 'Desktop';
  }

  // Update local time display
  function updateLocalTime() {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
      });
      document.getElementById('userLocalTime').textContent = timeString;
  }

  // Get system information
  function getSystemInfo() {
      return {
          browser: getBrowserInfo(),
          os: getOSInfo(),
          device: getDeviceType(),
          screen: `${screen.width}x${screen.height} (${screen.colorDepth}-bit)`,
          language: navigator.language || 'Unknown',
          platform: navigator.platform || 'Unknown',
          cookies: navigator.cookieEnabled ? 'Enabled' : 'Disabled'
      };
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

  // Populate user info in the UI
  function populateUserInfo(data) {
      // Update UI with user's IP info
      document.getElementById('userIp').textContent = data.ip;

      // Network Information
      document.getElementById('userIpType').textContent = data.version ? `${data.version}` : 'N/A';
      document.getElementById('userISP').textContent = data.org || 'N/A';
      document.getElementById('userASN').textContent = data.asn || 'N/A';
      document.getElementById('userNetwork').textContent = data.network || 'N/A';

      // Location Details
      document.getElementById('userCity').textContent = data.city || 'N/A';
      document.getElementById('userRegion').textContent = data.region || 'N/A';
      document.getElementById('userCountry').textContent = `${data.country_name || 'N/A'} ${data.country_flag || ''}`;
      document.getElementById('userPostal').textContent = data.postal || 'N/A';
      document.getElementById('userTimezone').textContent = data.timezone || 'N/A';
      document.getElementById('userCurrency').textContent = data.currency ? `${data.currency} (${data.currency_name || ''})` : 'N/A';
      document.getElementById('userCoords').textContent = (data.latitude && data.longitude)
          ? `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`
          : 'N/A';
      document.getElementById('userCallingCode').textContent = data.country_calling_code || 'N/A';

      // Device & Browser Information
      const systemInfo = getSystemInfo();
      document.getElementById('userBrowser').textContent = systemInfo.browser;
      document.getElementById('userOS').textContent = systemInfo.os;
      document.getElementById('userDevice').textContent = systemInfo.device;
      document.getElementById('userScreen').textContent = systemInfo.screen;
      document.getElementById('userLanguage').textContent = systemInfo.language;
      document.getElementById('userPlatform').textContent = systemInfo.platform;
      document.getElementById('userCookies').textContent = systemInfo.cookies;

      // Update local time
      updateLocalTime();
      setInterval(updateLocalTime, 1000); // Update every second

      // Initialize map with user's location
      if (data.latitude && data.longitude) {
          initMap(data.latitude, data.longitude, 10);
          addMarker(data.latitude, data.longitude, `Your Location: ${data.city}, ${data.country_name}`);
      } else {
          initMap();
      }
  }

  // Fetch user's IP information on load
  async function getUserIP() {
      try {
          // Try primary API
          let response = await fetch('https://ipapi.co/json/');

          // Check if we got rate limited
          if (response.status === 429) {
              console.warn('Rate limited on ipapi.co, trying fallback...');
              // Fallback to ip-api.com
              response = await
  fetch('http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query');
              const fallbackData = await response.json();

              if (fallbackData.status === 'success') {
                  // Map fallback API response to our format
                  const data = {
                      ip: fallbackData.query,
                      version: 'IPv4',
                      city: fallbackData.city,
                      region: fallbackData.regionName,
                      country_name: fallbackData.country,
                      country_code: fallbackData.countryCode,
                      postal: fallbackData.zip,
                      latitude: fallbackData.lat,
                      longitude: fallbackData.lon,
                      timezone: fallbackData.timezone,
                      org: fallbackData.isp,
                      asn: fallbackData.as,
                      network: 'N/A'
                  };
                  populateUserInfo(data);
                  return;
              }
          }

          const data = await response.json();

          if (data.error) {
              throw new Error(data.reason || 'Failed to fetch IP data');
          }

          populateUserInfo(data);
      } catch (error) {
          console.error('Error fetching user IP:', error);
          document.getElementById('userIp').textContent = 'Error loading IP';

          // Still show device/browser info even if IP fetch fails
          const systemInfo = getSystemInfo();
          document.getElementById('userBrowser').textContent = systemInfo.browser;
          document.getElementById('userOS').textContent = systemInfo.os;
          document.getElementById('userDevice').textContent = systemInfo.device;
          document.getElementById('userScreen').textContent = systemInfo.screen;
          document.getElementById('userLanguage').textContent = systemInfo.language;
          document.getElementById('userPlatform').textContent = systemInfo.platform;
          document.getElementById('userCookies').textContent = systemInfo.cookies;
          updateLocalTime();
          setInterval(updateLocalTime, 1000);

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