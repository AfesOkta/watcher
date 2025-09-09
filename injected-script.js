// injected-script.js
console.log("SIPD Watcher: Injected script is running and hooking network requests!");

// Store original fetch and XMLHttpRequest
const originalFetch = window.fetch;
const originalXHR = window.XMLHttpRequest;
const yearToday = new Date().getFullYear();
// --- Helper Functions to Handle Intercepted Data ---
let bearerToken = null; // store the bearer token

// Function to handle data from Fetch and post it to the content script
async function handleFetchResponse(response, url, type) {
  try {
    // Clone the response to avoid issues with the original stream
    const clonedResponse = response.clone();

    // Get headers from the original response
    const headers = response.headers;
    const currentPage = headers.get('X-Pagination-Current-Page');
    
    const data = await clonedResponse.json();

    // Determine the endpoint from the URL and headers
    let endpoint = url;
    if (currentPage) {
        endpoint += `&page=${currentPage}&limit=5`;
    }

    console.log(`SIPD Watcher (Injected): Intercepted response for ${url}. Current Page: ${currentPage}`, data);


    window.postMessage({
      type: type,
      endpoint: endpoint,
      payload: data
    }, "*");

  } catch (e) {
    console.warn(`SIPD Watcher (Injected): Failed to parse JSON from response for ${url}:`, e);
  }
}

// Function to handle data from XHR and post it to the content script
function handleXHRResponse(xhr, url, type) {
  try {
    // XHR headers are available via getResponseHeader
    const currentPage = xhr.getResponseHeader('X-Pagination-Current-Page');

    const data = JSON.parse(xhr.responseText);

     // Determine the endpoint from the URL and headers
    let endpoint = url;
    if (currentPage) {
        endpoint += `&page=${currentPage}&limit=5`;
    }

    console.log(`SIPD Watcher (Injected): Intercepted XHR response for ${url}. Current Page: ${currentPage}`, data);

    window.postMessage({
      type: type,
      endpoint: endpoint,
      payload: data
    }, "*");

  } catch (e) {
    console.warn(`SIPD Watcher (Injected): Failed to parse JSON from XHR response for ${url}:`, e);
  }
}

// --- Hooking Fetch ---
window.fetch = async function(...args) {
  const [resource, options] = args;
  const url = typeof resource === 'string' ? resource : resource.url;

  // Perform the original fetch request
  const response = await originalFetch(resource, options);

  // Check and handle specific endpoints
  if (url.includes('auth/auth/pre-login') || url.includes('auth/auth/login')) {    
    handleFetchResponse(response, url, "SIPD_AUTH_DATA");

    response.clone().json().then(data => {
      // Simpan token jika ditemukan
      if (data?.token || data?.access_token) {
        bearerToken = data.token || data.access_token;
        console.log("SIPD Watcher: Bearer token saved", bearerToken);
      }
    }).catch(e => {
      console.warn("SIPD Watcher: Failed to parse login token", e);
    });
  }

  if (url.includes('referensi/strict/rkud')) {
    // Perhatikan endpoint rkud yang lebih spesifik
    handleFetchResponse(response, url, "SIPD_REFERENSI_RKUD_DATA");
  }

  if (url.includes('penerimaan/strict/stbp/rekening/pengajuan')) {
    handleFetchResponse(response, url, "SIPD_REFERENSI_REKENING_PENGAJUAN_DATA");
  }

  if (url.includes('/auth/strict/user-manager')) {
    handleFetchResponse(response, url, "SIPD_USER_MANAGER_DATA");
  }
  
  if (url.includes('pegawai/strict/pegawai')) {
    handleFetchResponse(response, url, "SIPD_DATA_PEGAWAI");
  }

  if (url.includes(`referensi/strict/skpd/list/114/${yearToday}`)) {
    handleFetchResponse(response, url, "SIPD_DATA_SKPD");
  }

  if (url.includes(`referensi/strict/laporan/dpa/dpa/pendapatan`)) {     
    handleFetchResponse(response, url, "SIPD_DATA_DPA");
  }

  if (url.includes(`referensi/strict/jadwal`)) {
    handleFetchResponse(response, url, "SIPD_DATA_JADWAL");
  }

  if (url.includes(`penerimaan/strict/stbp/status`)) {
    handleFetchResponse(response, url, "SIPD_DATA_OTORISASI_PENERIMAAN");

     // Setelah dapat response, cek nilai dan lakukan request cetak jika perlu
    response.clone().json().then(data => {
        const id = url.split('/').pop(); // Ambil ID dari URL status
        if (data === true || data === 1 || data === "true" || data === "1") {
            const cetakUrl = `https://service.sipd.kemendagri.go.id/penerimaan/strict/stbp/cetak/${id}`;
                originalFetch(cetakUrl, {
                      headers: {
                        'Authorization': `Bearer ${bearerToken}`
                      }
                    })
                .then(cetakRes => cetakRes.json())
                .then(cetakData => {
                    console.log(`SIPD Watcher (Injected): Auto-fetch cetak triggered for ID ${id}`, cetakData);
                    window.postMessage({
                        type: "SIPD_DATA_CETAK_PENERIMAAN",
                        endpoint: cetakUrl,
                        payload: cetakData
                    }, "*");
                })
                .catch(err => {
                    console.error(`SIPD Watcher (Injected): Failed to fetch cetak data for ID ${id}`, err);
                });
        }
    }).catch(err => {
        console.warn("SIPD Watcher (Injected): Failed to parse status response JSON", err);
    });
  }
  return response; // Return the original response to the page
};

// --- Hooking XMLHttpRequest ---
window.XMLHttpRequest = class extends originalXHR {
  constructor() {
    super();
    this.addEventListener('readystatechange', () => {
      // We are interested when the request is done and we have a response
      if (this.readyState === 4) { // DONE
        const url = this.responseURL;
        
        // Check and handle specific endpoints
        if (url.includes('auth/auth/pre-login') || url.includes('auth/auth/login')) {        
          handleXHRResponse(this, url, "SIPD_AUTH_DATA");

          try {
              const data = JSON.parse(this.responseText);
              if (data?.token || data?.access_token) {
                  bearerToken = data.token || data.access_token;
                  console.log("SIPD Watcher: Bearer token saved", bearerToken);
              } else {
                  console.warn("SIPD Watcher: No token found in response");
              }
          } catch (e) {
              console.warn("SIPD Watcher: Failed to parse login token from XHR response", e);
          }
        }

        // Untuk mendapatkan xhr RKUD
        if (url.includes('referensi/strict/rkud')) {
          handleXHRResponse(this, url, "SIPD_REFERENSI_RKUD_DATA");
        }

        // Untuk mendapatkan xhr Rekening SKPD
        if (url.includes('penerimaan/strict/stbp/rekening/pengajuan')) {
            handleXHRResponse(this, url, "SIPD_REFERENSI_REKENING_PENGAJUAN_DATA");
        }

        // Untuk mendapatkan xhr USER MANAGER/PEGAWAI
        if (url.includes('/auth/strict/user-manager')) {
            handleXHRResponse(this, url, "SIPD_USER_MANAGER_DATA");
        }

        if (url.includes('pegawai/strict/pegawai')) {
            handleXHRResponse(this, url, "SIPD_DATA_PEGAWAI");
        }

        
        if (url.includes(`referensi/strict/skpd/list/114/${yearToday}`)) {
            handleXHRResponse(this, url, "SIPD_DATA_SKPD");
        }

        if (url.includes(`referensi/strict/laporan/dpa/dpa/pendapatan`)) {          
          handleXHRResponse(this, url, "SIPD_DATA_DPA");
        }

        if (url.includes(`referensi/strict/jadwal`)) {
          handleXHRResponse(this, url, "SIPD_DATA_JADWAL");
        }

        if (url.includes(`penerimaan/strict/stbp/status`)) {
          handleXHRResponse(this, url, "SIPD_DATA_OTORISASI_PENERIMAAN");

          try {
            const id = url.split('/').pop();
            const data = JSON.parse(this.responseText);
            if (data === true || data === 1 || data === "true" || data === "1") {
                const cetakUrl = `https://service.sipd.kemendagri.go.id/penerimaan/strict/stbp/cetak/${id}`;
                    originalFetch(cetakUrl, {
                      headers: {
                        'Authorization': `Bearer ${bearerToken}`
                      }
                    })
                    .then(cetakRes => cetakRes.json())
                    .then(cetakData => {
                        console.log(`SIPD Watcher (Injected): Auto-fetch cetak triggered for ID ${id}`, cetakData);
                        window.postMessage({
                            type: "SIPD_DATA_CETAK_PENERIMAAN",
                            endpoint: cetakUrl,
                            payload: cetakData
                        }, "*");
                    })
                    .catch(err => {
                        console.error(`SIPD Watcher (Injected): Failed to fetch cetak data for ID ${id}`, err);
                    });
            }
          } catch (err) {
              console.warn("SIPD Watcher (Injected): Failed to evaluate status response for cetak trigger", err);
          }
        }
      }
    });
  }
};


// --- Listener for messages from content script (dibiarkan seperti sebelumnya) ---
window.addEventListener('message', (event) => {
  if (event.source === window && event.data.type === 'FROM_CONTENT_SCRIPT') {
    console.log("SIPD Watcher (Injected): Received message from content script:", event.data.payload);
  }
});

// --- Button logic (dibiarkan seperti sebelumnya) ---
function addWatcherButton() {
  const body = document.querySelector('body');
  if (body) {
    const button = document.createElement('button');
    button.id = 'sipd-watcher-button';
    button.textContent = 'SIPD Watcher Action';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.onclick = () => {
      alert('SIPD Watcher button clicked!');
    };
    body.appendChild(button);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addWatcherButton);
} else {
  // addWatcherButton();
}