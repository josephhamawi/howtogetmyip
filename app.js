// Initialize map
  let map;
  let marker;

  // Cache for API responses to prevent rate limiting
  const apiCache = new Map();
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // IP Classification constants
  const PRIVATE_IP_RANGES = [
      { range: '10.0.0.0/8', name: 'Private Network (Class A)' },
      { range: '172.16.0.0/12', name: 'Private Network (Class B)' },
      { range: '192.168.0.0/16', name: 'Private Network (Class C)' },
      { range: '127.0.0.0/8', name: 'Loopback' },
      { range: '169.254.0.0/16', name: 'Link-Local' },
      { range: '224.0.0.0/4', name: 'Multicast' },
      { range: '240.0.0.0/4', name: 'Reserved' }
  ];

  // Known datacenter/hosting ASNs (partial list)
  const DATACENTER_ASNS = [
      'AS15169', 'AS16509', 'AS14618', // Google, Amazon, AWS
      'AS8075', 'AS12876', // Microsoft, Online SAS
      'AS20473', 'AS63949', // Choopa (Vultr), Linode
      'AS24940', 'AS16276' // Hetzner, OVH
  ];

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

  // IPv4 validation
  function isValidIPv4(ip) {
      const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      return ipv4Pattern.test(ip);
  }

  // IPv6 validation
  function isValidIPv6(ip) {
      const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
      return ipv6Pattern.test(ip);
  }

  // Check if IP is private/reserved
  function isPrivateIP(ip) {
      if (!isValidIPv4(ip)) return null;

      const octets = ip.split('.').map(Number);

      // Check each private range
      if (octets[0] === 10) return PRIVATE_IP_RANGES[0];
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return PRIVATE_IP_RANGES[1];
      if (octets[0] === 192 && octets[1] === 168) return PRIVATE_IP_RANGES[2];
      if (octets[0] === 127) return PRIVATE_IP_RANGES[3];
      if (octets[0] === 169 && octets[1] === 254) return PRIVATE_IP_RANGES[4];
      if (octets[0] >= 224 && octets[0] <= 239) return PRIVATE_IP_RANGES[5];
      if (octets[0] >= 240) return PRIVATE_IP_RANGES[6];

      return null;
  }

  // Detect if IP is from datacenter/hosting
  function isDatacenterIP(asn) {
      return DATACENTER_ASNS.includes(asn);
  }

  // Get IP version
  function getIPVersion(ip) {
      if (isValidIPv4(ip)) return 'IPv4';
      if (isValidIPv6(ip)) return 'IPv6';
      return 'Unknown';
  }

  // Copy to clipboard function
  function copyToClipboard(text, elementId) {
      navigator.clipboard.writeText(text).then(() => {
          const element = document.getElementById(elementId);
          const originalText = element.textContent;
          element.textContent = 'Copied!';
          element.style.color = 'var(--success-color)';

          setTimeout(() => {
              element.textContent = originalText;
              element.style.color = '';
          }, 2000);
      }).catch(err => {
          console.error('Failed to copy:', err);
      });
  }

  // Get cached data or fetch new
  function getCachedData(key) {
      const cached = apiCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          console.log('Using cached data for:', key);
          return cached.data;
      }
      return null;
  }

  // Set cache data
  function setCacheData(key, data) {
      apiCache.set(key, {
          data: data,
          timestamp: Date.now()
      });
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
      const ipElement = document.getElementById('userIp');
      ipElement.textContent = data.ip;
      ipElement.style.cursor = 'pointer';
      ipElement.title = 'Click to copy IP address';
      ipElement.onclick = () => copyToClipboard(data.ip, 'userIp');

      // Determine IP version and classification
      const ipVersion = getIPVersion(data.ip);
      const privateRange = isPrivateIP(data.ip);
      const isDatacenter = data.asn ? isDatacenterIP(data.asn) : false;

      // Network Information with enhanced classification
      let ipTypeText = ipVersion;
      if (privateRange) {
          ipTypeText += ` (${privateRange.name})`;
      } else if (isDatacenter) {
          ipTypeText += ' (Datacenter/Hosting)';
      } else if (data.connection_type) {
          ipTypeText += ` (${data.connection_type})`;
      }

      document.getElementById('userIpType').textContent = ipTypeText;
      document.getElementById('userISP').textContent = data.org || 'N/A';
      document.getElementById('userASN').textContent = data.asn || 'N/A';
      document.getElementById('userNetwork').textContent = data.network || 'N/A';

      // Connection and privacy status
      let connectionType = 'Unknown';
      if (isDatacenter) {
          connectionType = 'Datacenter/Hosting';
      } else if (data.connection_type) {
          connectionType = data.connection_type;
      } else if (privateRange) {
          connectionType = 'Private Network';
      }
      document.getElementById('userConnectionType').textContent = connectionType;

      // Privacy status indicators
      let privacyStatus = 'Standard';
      const privacyIndicators = [];
      if (privateRange) {
          privacyIndicators.push('Private IP');
      }
      if (data.is_proxy || data.proxy) {
          privacyIndicators.push('Proxy Detected');
      }
      if (data.is_hosting || isDatacenter) {
          privacyIndicators.push('Hosting/VPN Likely');
      }
      if (data.is_tor) {
          privacyIndicators.push('Tor Exit Node');
      }

      if (privacyIndicators.length > 0) {
          privacyStatus = privacyIndicators.join(', ');
      }
      document.getElementById('userPrivacy').textContent = privacyStatus;

      // Location Details
      document.getElementById('userCity').textContent = data.city || 'N/A';
      document.getElementById('userRegion').textContent = data.region || 'N/A';
      document.getElementById('userCountry').textContent = `${data.country_name || 'N/A'} ${data.country_flag || ''}`;
      document.getElementById('userPostal').textContent = data.postal || 'N/A';

      // Enhanced timezone display with UTC offset
      let timezoneText = data.timezone || 'N/A';
      if (data.timezone && data.utc_offset) {
          timezoneText = `${data.timezone} (UTC${data.utc_offset})`;
      }
      document.getElementById('userTimezone').textContent = timezoneText;

      document.getElementById('userCurrency').textContent = data.currency ? `${data.currency} (${data.currency_name || ''})` : 'N/A';

      // Make coordinates clickable to copy
      const coordsElement = document.getElementById('userCoords');
      if (data.latitude && data.longitude) {
          const coordsText = `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`;
          coordsElement.textContent = coordsText;
          coordsElement.style.cursor = 'pointer';
          coordsElement.title = 'Click to copy coordinates';
          coordsElement.onclick = () => copyToClipboard(coordsText, 'userCoords');
      } else {
          coordsElement.textContent = 'N/A';
      }

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
          // Check cache first
          const cached = getCachedData('userIP');
          if (cached) {
              populateUserInfo(cached);
              return;
          }

          // Try primary API with retry logic
          let response;
          let data;
          let attempts = 0;
          const maxAttempts = 2;

          while (attempts < maxAttempts) {
              try {
                  response = await fetch('https://ipapi.co/json/', {
                      signal: AbortSignal.timeout(10000) // 10 second timeout
                  });

                  // Check if we got rate limited
                  if (response.status === 429) {
                      console.warn('Rate limited on ipapi.co, trying fallback...');
                      break;
                  }

                  if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  data = await response.json();

                  if (data.error) {
                      throw new Error(data.reason || 'Failed to fetch IP data');
                  }

                  // Success - cache and populate
                  setCacheData('userIP', data);
                  populateUserInfo(data);
                  return;
              } catch (err) {
                  attempts++;
                  if (attempts >= maxAttempts) {
                      console.warn('Primary API failed, trying fallback...', err);
                      break;
                  }
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 1000));
              }
          }

          // Fallback to ip-api.com (HTTPS version)
          try {
              response = await fetch('https://ipapi.co/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,proxy,hosting', {
                  signal: AbortSignal.timeout(10000)
              });

              const fallbackData = await response.json();

              if (fallbackData.status === 'success') {
                  // Map fallback API response to our format
                  data = {
                      ip: fallbackData.query,
                      version: getIPVersion(fallbackData.query),
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
                      network: 'N/A',
                      is_proxy: fallbackData.proxy,
                      is_hosting: fallbackData.hosting
                  };

                  setCacheData('userIP', data);
                  populateUserInfo(data);
                  return;
              }
          } catch (fallbackError) {
              console.error('Fallback API also failed:', fallbackError);
          }

          throw new Error('All API attempts failed');

      } catch (error) {
          console.error('Error fetching user IP:', error);
          const ipDisplay = document.getElementById('userIp');
          ipDisplay.textContent = 'Error loading IP data';
          ipDisplay.style.color = 'var(--error-color)';

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
      // Validate IP format (IPv4 or IPv6)
      if (!isValidIPv4(ip) && !isValidIPv6(ip)) {
          showError('Please enter a valid IPv4 (e.g., 8.8.8.8) or IPv6 address');
          return;
      }

      // Check if it's a private/reserved IP
      const privateRange = isPrivateIP(ip);
      if (privateRange) {
          showError(`Cannot trace ${privateRange.name} address. This IP is not publicly routable.`);
          return;
      }

      hideError();
      hideTraceResult();

      // Show loading state
      const traceBtn = document.getElementById('traceBtn');
      const originalText = traceBtn.textContent;
      traceBtn.textContent = 'Tracing...';
      traceBtn.disabled = true;

      try {
          // Check cache first
          const cacheKey = `trace_${ip}`;
          const cached = getCachedData(cacheKey);

          let data;
          if (cached) {
              data = cached;
          } else {
              // Try primary API with timeout
              let response = await fetch(`https://ipapi.co/${ip}/json/`, {
                  signal: AbortSignal.timeout(10000)
              });

              // Handle rate limiting with fallback
              if (response.status === 429) {
                  console.warn('Rate limited, trying fallback API...');
                  response = await fetch(`https://ipapi.co/${ip}/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query,proxy,hosting`, {
                      signal: AbortSignal.timeout(10000)
                  });
              }

              if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
              }

              data = await response.json();

              if (data.error) {
                  throw new Error(data.reason || 'Failed to fetch IP data');
              }

              // Cache the result
              setCacheData(cacheKey, data);
          }

          // Analyze IP characteristics
          const ipVersion = getIPVersion(ip);
          const isDatacenter = data.asn ? isDatacenterIP(data.asn) : false;

          // Update UI with traced IP info
          const tracedIpElement = document.getElementById('tracedIp');
          tracedIpElement.textContent = data.ip;
          tracedIpElement.style.cursor = 'pointer';
          tracedIpElement.title = 'Click to copy IP address';
          tracedIpElement.onclick = () => copyToClipboard(data.ip, 'tracedIp');

          document.getElementById('traceCity').textContent = data.city || 'N/A';
          document.getElementById('traceRegion').textContent = data.region || 'N/A';
          document.getElementById('traceCountry').textContent = `${data.country_name || 'N/A'} ${data.country_flag || ''} (${data.country_code || '-'})`;

          let ispText = data.org || 'N/A';
          if (isDatacenter) {
              ispText += ' (Datacenter/Hosting)';
          }
          if (data.is_proxy) {
              ispText += ' (Proxy Detected)';
          }
          document.getElementById('traceISP').textContent = ispText;

          const latElement = document.getElementById('traceLat');
          const lonElement = document.getElementById('traceLon');
          latElement.textContent = data.latitude ? data.latitude.toFixed(6) : 'N/A';
          lonElement.textContent = data.longitude ? data.longitude.toFixed(6) : 'N/A';

          // Add click to copy for coordinates
          if (data.latitude && data.longitude) {
              const coords = `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}`;
              latElement.style.cursor = 'pointer';
              lonElement.style.cursor = 'pointer';
              latElement.title = 'Click to copy coordinates';
              lonElement.title = 'Click to copy coordinates';
              latElement.onclick = () => copyToClipboard(coords, 'traceLat');
              lonElement.onclick = () => copyToClipboard(coords, 'traceLon');
          }

          // Show additional info if available
          if (document.getElementById('traceASN')) {
              document.getElementById('traceASN').textContent = data.asn || 'N/A';
          }
          if (document.getElementById('traceTimezone')) {
              document.getElementById('traceTimezone').textContent = data.timezone || 'N/A';
          }
          if (document.getElementById('traceIPType')) {
              let typeText = ipVersion;
              if (isDatacenter) typeText += ' (Datacenter)';
              else if (data.connection_type) typeText += ` (${data.connection_type})`;
              document.getElementById('traceIPType').textContent = typeText;
          }

          // Show result
          showTraceResult();

          // Update map with traced location
          if (data.latitude && data.longitude) {
              addMarker(data.latitude, data.longitude, `${data.city || 'Unknown'}, ${data.country_name || 'Unknown'}`);
          }
      } catch (error) {
          console.error('Error tracing IP:', error);
          showError(`Error: ${error.message || 'Failed to trace IP address'}`);
      } finally {
          // Restore button state
          traceBtn.textContent = originalText;
          traceBtn.disabled = false;
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