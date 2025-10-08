// injected-script.js
console.log("SIPD Watcher: Injected script is running and hooking network requests!");

// Store original fetch and XMLHttpRequest
const originalFetch = window.fetch;
const originalXHR = window.XMLHttpRequest;
const yearToday = new Date().getFullYear();
// --- Helper Functions to Handle Intercepted Data ---
let bearerToken = null; // store the bearer token

// Fungsi untuk ambil token dari chrome.storage.local
function getSipdToken() {
  return new Promise((resolve) => {
    window.postMessage({ type: "GET_SIPD_TOKEN" }, window.location.origin);

    function handler(event) {
      if (event.source !== window) return;
      if (event.data.type === "SIPD_TOKEN_RESPONSE") {
        window.removeEventListener("message", handler);
        resolve(event.data.token || null);
      }
    }
    window.addEventListener("message", handler);
  });
}

// Fungsi untuk ambil data STS
async function fetchSTSData(id_skpd, extraStbpData = []) {
  const token = await getSipdToken();
  if (!token) return;

  try {
    const stsUrl = `https://service.sipd.kemendagri.go.id/penerimaan/strict/sts?page=1&limit=10&jenis=ALL&status=aktif&id_skpd=${id_skpd}`;

    const stsRes = await originalFetch(stsUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stsList = await stsRes.json();

    if (!Array.isArray(stsList)) {
      console.warn("⚠️ SIPD Watcher: Unexpected STS response format", stsList);
      return;
    }

    // --- Batasi concurrency
    const concurrencyLimit = 3; // maksimal 3 fetch detail sekaligus
    const mergedData = [];

    for (let i = 0; i < stsList.length; i += concurrencyLimit) {
      const batch = stsList.slice(i, i + concurrencyLimit);

      const batchResults = await Promise.all(
        batch.map(async (header) => {
          try {
            const detailUrl = `https://service.sipd.kemendagri.go.id/penerimaan/strict/sts/cetak/${header.id_sts}`;
            const detailRes = await originalFetch(detailUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const detailJson = await detailRes.json();

            return {
              ...header,
              nama_bank: detailJson.nama_bank ?? null,
              pegawai_pa_kpa_nama: detailJson.pegawai_pa_kpa_nama ?? null,
              pegawai_pa_kpa_nip: detailJson.pegawai_pa_kpa_nip ?? null,
              bendahara_penerimaan_nama: detailJson.bendahara_penrimaan_nama ?? null,
              bendahara_penerimaan_nip: detailJson.bendahara_penrimaan_nip ?? null,
              nama_skpd: detailJson.nama_skpd ?? null,
              nama_daerah: detailJson.nama_daerah ?? null,
              data_detail: detailJson.data_detail ?? [],
            };
          } catch (err) {
            console.error(`❌ Gagal ambil detail STS ${header.id_sts}:`, err);
            return { ...header, data_detail: [] };
          }
        })
      );

      mergedData.push(...batchResults);
      // opsional: jeda 500 ms antar batch untuk lebih aman
      await new Promise((res) => setTimeout(res, 500));
    }


    // Merge dengan extraStbpData
    const finalPayload = mergedData.map((item) => {
      return {
        ...item,
        stbp_extra: extraStbpData, // tambahkan stbpData dari POST sebelumnya
      };
    });

    // Kirim hasil akhir
    window.postMessage(
      {
        type: "SIPD_DATA_GET_PENYETORAN",
        endpoint: stsUrl,
        payload: finalPayload,
      },
      "*"
    );

    console.log(
      `✅ SIPD Watcher: Fetch + merge data STS selesai (ID SKPD: ${id_skpd})`,
      finalPayload
    );
  } catch (err) {
    console.error("❌ Error fetch STS:", err);
  }
}


async function fetchSTBPData(id_skpd) {
  const token = await getSipdToken();
  if (!token) return;
  const cetakUrl = `https://service.sipd.kemendagri.go.id/penerimaan/strict/stbp/cetak/${id_skpd}`;
  originalFetch(cetakUrl, {
    headers: {
      'Authorization': `Bearer ${bearerToken}`
    }
  })
    .then(cetakRes => cetakRes.json())
    .then(cetakData => {
      console.log(`SIPD Watcher (Injected): Auto-fetch cetak triggered for ID ${id_skpd}`, cetakData);
      window.postMessage({
        type: "SIPD_DATA_CETAK_PENERIMAAN",
        endpoint: cetakUrl,
        payload: cetakData
      }, "*");
    })
    .catch(err => {
      console.error(`SIPD Watcher (Injected): Failed to fetch cetak data for ID ${id_skpd}`, err);
    });
}

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

// const originalFetch = window.fetch;

// --- Hooking Fetch ---
window.fetch = async function (...args) {
  const [resource, options] = args;
  const url = typeof resource === 'string' ? resource : resource.url;
  const method = options?.method?.toUpperCase() || 'GET';

  // ⬅️ Ambil payload (body) jika ada
  let requestPayload = null;
  if (options?.body) {
    try {
      requestPayload = JSON.parse(options.body);
    } catch (e) {
      requestPayload = options.body; // kalau bukan JSON
    }
  }

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

  if (method === 'PUT' && url.includes(`penerimaan/strict/stbp/status`)) {
    console.log("📩 Intercepted request payload:", requestPayload);
    handleFetchResponse(response, url, "SIPD_DATA_OTORISASI_PENERIMAAN");

    // Setelah dapat response, cek nilai dan lakukan request cetak jika perlu
    response.clone().json().then(data => {
      try {
        let requestPayload = null;
        if (this._requestBody) {
          try {
            requestPayload = JSON.parse(this._requestBody);
          } catch (error) {
            requestPayload = this._requestBody;
          }
        }
        console.log("📩 Intercepted XHR request payload:", requestPayload);

        const id = url.split('/').pop(); // Ambil ID dari URL status
        const data = JSON.parse(this.responseText);
        if (requestPayload?.update === "Otorisasi" && (data === true || data === 1 || data === "true" || data === "1")) {
          fetchSTBPData(id);
        }
      } catch (err) {
        console.warn("SIPD Watcher (Injected): Failed to evaluate status response for cetak trigger", err);
      }
    }).catch(err => {
      console.warn("SIPD Watcher (Injected): Failed to parse status response JSON", err);
    });
  }

  if (url.includes(`penerimaan/strict/sts`)) {
    handleFetchResponse(response, url, "SIPD_DATA_CREATE_STS");
    // Clone supaya bisa dibaca ulang
    const cloned = response.clone();
    if (method === 'DELETE') {
      const id = url.split('/').pop(); // Ambil ID dari URL status
      console.log("🚀 Response STS terdeteksi DELETE…");

    } else if (method === 'POST') {
      try {
        const data = await cloned.json();
        if (data === true || data?.sts === true) {
          console.log("🚀 Response STS terdeteksi TRUE, auto-fetch STS endpoint…");
          fetchSTSData();
        }
      } catch (err) {
        // kalau bukan JSON, biarin aja
      }
    }
  }
  return response; // Return the original response to the page
};

// --- Hooking XMLHttpRequest ---
window.XMLHttpRequest = class extends originalXHR {
  constructor() {
    super();
    this._requestBody = null;
    this._method = null; // simpan method
    this._url = null;    // simpan url

    this.addEventListener('readystatechange', () => {
      // We are interested when the request is done and we have a response
      if (this.readyState === 4) { // DONE
        const url = this.responseURL;
        const method = this._method || 'GET';

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
            let requestPayload = null;
            if (this._requestBody) {
              try {
                requestPayload = JSON.parse(this._requestBody);
              } catch (error) {
                requestPayload = this._requestBody;
              }
            }
            console.log("📩 Intercepted XHR request payload:", requestPayload);

            const id = url.split('/').pop();
            const data = JSON.parse(this.responseText);
            if (requestPayload?.update === "Otorisasi" && (data === true || data === 1 || data === "true" || data === "1")) {
              fetchSTBPData(id);
            }
          } catch (err) {
            console.warn("SIPD Watcher (Injected): Failed to evaluate status response for cetak trigger", err);
          }
        }

        // === INTERCEPT STS ===
        if (url.includes("penerimaan/strict/sts")) {
          handleXHRResponse(this, url, "SIPD_DATA_CREATE_STS");
          try {
            let requestPayload = null;
            if (this._requestBody) {
              try {
                requestPayload = JSON.parse(this._requestBody);
              } catch (e) {
                requestPayload = this._requestBody;
              }
            }
            const id_skpd = requestPayload?.id_skpd;

            //if (method === 'POST') {
            console.log("🚀 STS POST detected, payload:", requestPayload);
            const data = JSON.parse(this.responseText);
            if (data === true || data === "true" || data === 1 || data === "1") {
              fetchSTSData(id_skpd, requestPayload?.stbp || []);
            }
            // } else if (method === 'DELETE') {
            //   console.log("🗑️ STS DELETE detected, URL ID:", url.split('/').pop());
            // } else {
            //   console.log(`ℹ️ STS request detected with method ${method}`);
            // }
          } catch (err) {
            console.warn("SIPD Watcher: Failed to handle STS", err);
          }
        }
      }
    });
  }

  // hook send() untuk tangkap body
  send(body) {
    if (body) {
      this._requestBody = body;
    }
    return super.send(body);
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