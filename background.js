// background.js
console.log("SIPD Watcher: Background service worker is running!");

chrome.runtime.onInstalled.addListener(() => {
  console.log("SIPD Watcher: Extension installed!");
  chrome.storage.sync.set({ watcherEnabled: true }, () => {
    console.log("SIPD Watcher: Default settings saved.");
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("SIPD Watcher: Message received in background script:", request);
  
  // --- Informasi Basic Auth ---
  const username = "eRevenue";
  const password = "AlHaMdUlIlLaH";
  // Gabungkan username dan password dengan titik dua, lalu encode ke Base64
  const basicAuthToken = btoa(`${username}:${password}`); // btoa() adalah fungsi global untuk Base64 encoding

  if (request.type === "SIPD_AUTH_DATA_CAPTURED") {
    const { endpoint, payload } = request;
    console.log(`SIPD Watcher (Background): Captured ${endpoint} data:`, payload);

    // Store the captured data in Chrome local storage
    chrome.storage.local.set({
      [`sipd_auth_${endpoint}`]: payload,
      lastAuthCaptureTimestamp: Date.now()
    }, () => {
      console.log(`SIPD Watcher (Background): ${endpoint} data saved to local storage.`);
      sendResponse({ status: "success", message: `${endpoint} data saved.` });
    });
    
    // --- Tambahkan logika ini untuk mengirim data login ke API Anda ---
    if (endpoint === "login") {
      const apiEndpoint = "http://prototype.test/api/sipd-token"; // Ganti dengan URL API Anda yang sebenarnya!
      const dataToSend = {
        token: payload.token,
        refreshToken: payload.refresh_token,
        // Anda bisa menambahkan data lain dari payload login yang Anda butuhkan
        isDefaultPassword: payload.is_default_password,
        capturedAt: new Date().toISOString() // Tambahkan timestamp kapan data diambil
      };

      fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Tambahkan header otorisasi jika API Anda membutuhkannya
          "Authorization": `Basic ${basicAuthToken}`
        },
        body: JSON.stringify(dataToSend)
      })
      .then(response => {
        if (!response.ok) {
          // Jika respons bukan 2xx OK
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json(); // Atau response.text() tergantung pada respons API Anda
      })
      .then(apiResponse => {
        console.log("SIPD Watcher (Background): Data login berhasil dikirim ke API:", apiResponse);
        sendResponse({ status: "success", message: "Login data sent to API.", apiResponse: apiResponse });
      })
      .catch(error => {
        console.error("SIPD Watcher (Background): Gagal mengirim data login ke API:", error);
        sendResponse({ status: "error", message: `Failed to send login data to API: ${error.message}` });
      });
      // Kembalikan true karena sendResponse akan dipanggil secara asinkron
      return true;
    }

    sendResponse({ status: "success", message: `${endpoint} data processed.` });
    return true; // Tetap kembalikan true untuk kasus non-login juga

  } else if (request.type === "SIPD_RKUD_DATA_CAPTURED") {
    const { endpoint, payload } = request;
    console.log(`SIPD Watcher (Background): Captured ${endpoint} data:`, payload);

    const apiEndpoint = "http://prototype.test/api/sipd-rkud"; // Ganti dengan URL API Anda yang sebenarnya!
    const dataToSend = {
      nama_bank: payload[0].nama_bank,
      nama_jenis_rkud: payload[0].nama_jenis_rkud,
      no_rekening: payload[0].no_rekening,
      nama_rekening: payload[0].nama_rekening,
      data_from_sipd: payload[0],
      capturedAt: new Date().toISOString()
    };

    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Tambahkan header otorisasi jika API Anda membutuhkannya
        "Authorization": `Basic ${basicAuthToken}`
      },
      body: JSON.stringify(dataToSend)
    })
    .then(response => {
      if (!response.ok) {
        // Jika respons bukan 2xx OK
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json(); // Atau response.text() tergantung pada respons API Anda
    })
    .then(apiResponse => {
      console.log("SIPD Watcher (Background): Data RKUD berhasil dikirim ke API:", apiResponse);
      sendResponse({ status: "success", message: "Data RKUD sent to API.", apiResponse: apiResponse });
    })
    .catch(error => {
      console.error("SIPD Watcher (Background): Gagal mengirim data RKUD ke API:", error);
      sendResponse({ status: "error", message: `Failed to send RKUD data to API: ${error.message}` });
    });
    // Kembalikan true karena sendResponse akan dipanggil secara asinkron
    return true;
  } else if (request.type === "SIPD_REFERENSI_REKENING_PENGAJUAN_CAPTURED") {
    const { endpoint, payload } = request;
    console.log(`SIPD Watcher (Background): Captured ${endpoint} data:`, payload);

    const apiEndpoint = "http://prototype.test/api/sipd-rekening-skpd"; // Ganti dengan URL API Anda yang sebenarnya!
    const dataToSend = {
      data_from_sipd: payload,
      capturedAt: new Date().toISOString()
    };

    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Tambahkan header otorisasi jika API Anda membutuhkannya
        "Authorization": `Basic ${basicAuthToken}`
      },
      body: JSON.stringify(dataToSend)
    })
    .then(response => {
      if (!response.ok) {
        // Jika respons bukan 2xx OK
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json(); // Atau response.text() tergantung pada respons API Anda
    })
    .then(apiResponse => {
      console.log("SIPD Watcher (Background): Data REKENING BANK berhasil dikirim ke API:", apiResponse);
      sendResponse({ status: "success", message: "Data REKENING BANK sent to API.", apiResponse: apiResponse });
    })
    .catch(error => {
      console.error("SIPD Watcher (Background): Gagal mengirim data REKENING BANK ke API:", error);
      sendResponse({ status: "error", message: `Failed to send REKENING BANK data to API: ${error.message}` });
    });
    // Kembalikan true karena sendResponse akan dipanggil secara asinkron
    return true;
  } else if (request.type === "SIPD_USER_MANAGER_DATA_CAPTURED") {
    const { endpoint, payload } = request;
    console.log(`SIPD Watcher (Background): Captured ${endpoint} data:`, payload);

    const apiEndpoint = "http://prototype.test/api/sipd-add-user"; // Ganti dengan URL API Anda yang sebenarnya!
    const dataToSend = {
      data_from_sipd: payload,
      capturedAt: new Date().toISOString()
    };

    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Tambahkan header otorisasi jika API Anda membutuhkannya
        "Authorization": `Basic ${basicAuthToken}`
      },
      body: JSON.stringify(dataToSend)
    })
    .then(response => {
      if (!response.ok) {
        // Jika respons bukan 2xx OK
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json(); // Atau response.text() tergantung pada respons API Anda
    })
    .then(apiResponse => {
      console.log("SIPD Watcher (Background): Data USER berhasil dikirim ke API:", apiResponse);
      sendResponse({ status: "success", message: "Data USER sent to API.", apiResponse: apiResponse });
    })
    .catch(error => {
      console.error("SIPD Watcher (Background): Gagal mengirim data USER ke API:", error);
      sendResponse({ status: "error", message: `Failed to send USER data to API: ${error.message}` });
    });
    // Kembalikan true karena sendResponse akan dipanggil secara asinkron
    return true;
  } else if (request.type === "SIPD_DATA_DPA_CAPTURED") {
    const { endpoint, payload, tahapan, skpd } = request;
    console.log(`SIPD Watcher (Background): Captured ${endpoint} data:`, payload);    

    const apiEndpoint = "http://prototype.test/api/sipd-add-dpa"; // Ganti dengan URL API Anda yang sebenarnya!
    const dataToSend = {
      data_from_sipd: payload,
      data_tahapan: tahapan,
      data_organisasi: skpd,
      capturedAt: new Date().toISOString()
    };

    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Tambahkan header otorisasi jika API Anda membutuhkannya
        "Authorization": `Basic ${basicAuthToken}`
      },
      body: JSON.stringify(dataToSend)
    })
    .then(response => {
      if (!response.ok) {
        // Jika respons bukan 2xx OK
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json(); // Atau response.text() tergantung pada respons API Anda
    })
    .then(apiResponse => {
      console.log("SIPD Watcher (Background): Data DPA berhasil dikirim ke API:", apiResponse);
      sendResponse({ status: "success", message: "Data DPA sent to API.", apiResponse: apiResponse });
    })
    .catch(error => {
      console.error("SIPD Watcher (Background): Gagal mengirim data DPA ke API:", error);
      sendResponse({ status: "error", message: `Failed to send DPA data to API: ${error.message}` });
    });
    // Kembalikan true karena sendResponse akan dipanggil secara asinkron
    return true;
  } else if (request.type === "SIPD_DATA_SKPD_CAPTURED") {
    const { endpoint, payload } = request;
    console.log(`SIPD Watcher (Background): Captured ${endpoint} data:`, payload);

    const apiEndpoint = "http://prototype.test/api/sipd-add-skpd"; // Ganti dengan URL API Anda yang sebenarnya!
    const dataToSend = {
      data_from_sipd: payload,
      capturedAt: new Date().toISOString()
    };

    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Tambahkan header otorisasi jika API Anda membutuhkannya
        "Authorization": `Basic ${basicAuthToken}`
      },
      body: JSON.stringify(dataToSend)
    })
    .then(response => {
      if (!response.ok) {
        // Jika respons bukan 2xx OK
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json(); // Atau response.text() tergantung pada respons API Anda
    })
    .then(apiResponse => {
      console.log("SIPD Watcher (Background): Data SKPD berhasil dikirim ke API:", apiResponse);
      sendResponse({ status: "success", message: "Data SKPD sent to API.", apiResponse: apiResponse });
    })
    .catch(error => {
      console.error("SIPD Watcher (Background): Gagal mengirim data SKPD ke API:", error);
      sendResponse({ status: "error", message: `Failed to send SKPD data to API: ${error.message}` });
    });
    // Kembalikan true karena sendResponse akan dipanggil secara asinkron
    return true;
  } else if (request.type === "SIPD_DATA_JADWAL_CAPTURED") {
    const { endpoint, payload } = request;
    console.log(`SIPD Watcher (Background): Captured ${endpoint} data:`, payload);

    const apiEndpoint = "http://prototype.test/api/sipd-add-jadwal"; // Ganti dengan URL API Anda yang sebenarnya!
    const dataToSend = {
      data_from_sipd: payload,
      capturedAt: new Date().toISOString()
    };

    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Tambahkan header otorisasi jika API Anda membutuhkannya
        "Authorization": `Basic ${basicAuthToken}`
      },
      body: JSON.stringify(dataToSend)
    })
    .then(response => {
      if (!response.ok) {
        // Jika respons bukan 2xx OK
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json(); // Atau response.text() tergantung pada respons API Anda
    })
    .then(apiResponse => {
      console.log("SIPD Watcher (Background): Data Jadwal berhasil dikirim ke API:", apiResponse);
      sendResponse({ status: "success", message: "Data Jadwal sent to API.", apiResponse: apiResponse });
    })
    .catch(error => {
      console.error("SIPD Watcher (Background): Gagal mengirim data Jadwal ke API:", error);
      sendResponse({ status: "error", message: `Failed to send Jadwal data to API: ${error.message}` });
    });
    // Kembalikan true karena sendResponse akan dipanggil secara asinkron
    return true;
  } else if (request.type === "SIPD_DATA_CETAK_PENERIMAAN_CAPTURED`") {
    const { endpoint, payload } = request;
    console.log(`SIPD Watcher (Background): Captured ${endpoint} data:`, payload); 

    const apiEndpoint = "http://prototype.test/api/sipd-add-stbp"; // Ganti dengan URL API Anda yang sebenarnya!
    const dataToSend = {
      bendahara_penerimaan_nama: payload.bendahara_penerimaan_nama,
      bendahara_penerimaan_nip: payload.bendahara_penerimaan_nip,
      keterangan_stbp: payload.keterangan_stbp,
      nomor_stbp: payload.nomor_stbp,
      nama_penyetor: payload.nama_penyetor,
      nama_skpd: payload.nama_skpd,
      id_skpd: payload.id_skpd,
      nilai_stbp: payload.nilai_stbp,
      tanggal_stbp: payload.tanggal_stbp,
      detail_transaksi: payload.data_detail,
      capturedAt: new Date().toISOString()
    };

  } else if (request.type === "GET_WATCHER_STATUS") {
    chrome.storage.sync.get('watcherEnabled', (data) => {
      sendResponse({ status: data.watcherEnabled });
    });
    return true;
  } else if (request.type === "TOGGLE_WATCHER") {
    chrome.storage.sync.get('watcherEnabled', (data) => {
      const newStatus = !data.watcherEnabled;
      chrome.storage.sync.set({ watcherEnabled: newStatus }, () => {
        console.log(`SIPD Watcher: Status toggled to ${newStatus}`);
        sendResponse({ status: newStatus });
      });
    });
    return true;
  } else if (request.type === "GET_SAVED_AUTH_DATA") {
      // Example of how a popup or other script could request the saved data
      chrome.storage.local.get(['sipd_auth_pre-login', 'sipd_auth_login'], (data) => {
          sendResponse({
              preLoginData: data['sipd_auth_pre-login'],
              loginData: data['sipd_auth_login']
          });
      });
      return true;
  }

  if (request.action === "getSipdToken") {
    chrome.storage.local.get(
      ["sipd_auth_https://service.sipd.kemendagri.go.id/auth/auth/login"],
      (result) => {
        const authData =
          result["sipd_auth_https://service.sipd.kemendagri.go.id/auth/auth/login"];
        if (authData && authData.token) {
          sendResponse({ token: authData.token });
        } else {
          sendResponse({ token: null });
        }
      }
    );
    return true; // biar async sendResponse tetap jalan
  }
});

// Example: Handling specific tab updates (from previous version, keep if needed)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('sipd.go.id')) {
    console.log(`SIPD Watcher: SIPD tab updated: ${tab.url}`);
    chrome.tabs.sendMessage(tabId, { type: "SIPD_PAGE_LOADED" }).catch(error => {
        console.warn("SIPD Watcher: Error sending message to content script:", error);
    });
  }
});

/**
   * {
      "id_stbp": 260484,
      "nomor_stbp": "35.78/41.0/000850/STBP/5.02.0.00.0.00.02.0000/8/2025",
      "nama_penyetor": "BEND.PNRM.BPKAD KOTA SURABAYA",
      "metode_input": "Harian",
      "tanggal_stbp": "2025-08-12T00:00:00Z",
      "id_bank": 108,
      "nama_bank": "Bank JATIM",
      "no_rekening": "0011255809",
      "nilai_stbp": 1679290931,
      "keterangan_stbp": "Hasil Sewa BMD",
      "created_by": 587490,
      "bendahara_penerimaan_nama": "SRI WAHYUNI, S.Si",
      "bendahara_penerimaan_nip": "197408022014122001",
      "nama_skpd": "Badan Pengelolaan Keuangan dan Aset Daerah",
      "id_unit": 1476,
      "id_skpd": 1476,
      "id_sub_skpd": 1476,
      "nama_daerah": "Kota Surabaya",
      "data_detail": [
          {
              "id_rekening": 12449,
              "kode_rekening": "4.1.04.03.01.0001",
              "uraian": "Hasil Sewa BMD",
              "metode_input": "Harian",
              "nilai": 1679290931
          }
      ]
  }
 */